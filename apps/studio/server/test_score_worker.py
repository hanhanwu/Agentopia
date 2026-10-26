"""Hermetic checks for the local scoring bridge's outbound boundary."""
import importlib.util
from pathlib import Path
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('score_worker', Path(__file__).with_name('score_worker.py'))
worker = importlib.util.module_from_spec(spec)
spec.loader.exec_module(worker)


def address(value):
    return (10 if ':' in value else 2, 1, 6, '', (value, 443))


class ScoreWorkerTests(unittest.TestCase):
    def test_private_local_mapped_and_mixed_dns_answers_are_rejected(self):
        for addresses in [['127.0.0.1'], ['10.1.2.3'], ['169.254.169.254'], ['::1'],
                          ['::ffff:8.8.8.8'], ['8.8.8.8', '192.168.1.1']]:
            with self.subTest(addresses=addresses), patch.object(worker.socket, 'getaddrinfo', return_value=list(map(address, addresses))):
                with self.assertRaises(worker.InvalidTarget):
                    worker.public_addresses('https://mcp.example/mcp')

    def test_original_host_and_public_ip_remain_pinned_across_requests(self):
        with patch.object(worker.socket, 'getaddrinfo', return_value=[address('8.8.8.8')]) as dns:
            transport = worker.PublicHTTPTransport('https://mcp.example/mcp')
            with patch.object(worker.HTTPTransport, 'request', return_value='reply') as request:
                for _ in range(2):
                    self.assertEqual(transport.request('probe'), 'reply')
                    self.assertEqual(request.call_args.kwargs['connect_ip'], '8.8.8.8')
                self.assertEqual(transport.endpoint, 'https://mcp.example/mcp')
                self.assertEqual(dns.call_count, 1)

    def test_anonymous_metadata_cannot_override_the_public_pin(self):
        with patch.object(worker.socket, 'getaddrinfo', return_value=[address('8.8.8.8')]):
            transport = worker.PublicHTTPTransport('https://mcp.example/mcp')
        with patch.object(worker.socket, 'getaddrinfo', return_value=[address('1.1.1.1')]), patch.object(worker.HTTPTransport, 'request') as request:
            transport.request('metadata', 'GET', url='https://auth.example/metadata', anonymous=True, connect_ip='127.0.0.1')
            self.assertEqual(request.call_args.kwargs['connect_ip'], '1.1.1.1')
        with patch.object(worker.socket, 'getaddrinfo', return_value=[address('127.0.0.1')]), patch.object(worker.HTTPTransport, 'request') as request:
            with self.assertRaises(worker.InvalidTarget):
                transport.request('metadata', 'GET', url='https://private.example/metadata', anonymous=True)
            request.assert_not_called()

    def test_cached_hosts_still_validate_each_metadata_url(self):
        with patch.object(worker.socket, 'getaddrinfo', return_value=[address('8.8.8.8')]):
            transport = worker.PublicHTTPTransport('https://mcp.example/mcp')
        with patch.object(worker.HTTPTransport, 'request') as request:
            for url in ['https://token@mcp.example/metadata', 'https://mcp.example/metadata#fragment']:
                with self.subTest(url=url), self.assertRaises(worker.InvalidTarget):
                    transport.request('metadata', 'GET', url=url, anonymous=True)
            request.assert_not_called()

    def test_invalid_destinations_are_rejected_before_dns(self):
        with patch.object(worker.socket, 'getaddrinfo', side_effect=AssertionError('No DNS')):
            for endpoint in ['file:///tmp/data', 'https://token@example.com/mcp', 'https://example.com/mcp#secret', 'https://example.com:0/mcp']:
                with self.subTest(endpoint=endpoint), self.assertRaises((ValueError, worker.InvalidTarget)):
                    worker.PublicHTTPTransport(endpoint)


if __name__ == '__main__':
    unittest.main()
