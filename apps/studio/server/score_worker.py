"""One bounded Studio scoring job. Import the installed engine, never notebook code."""

import ipaddress
import json
import socket
import sys
from urllib.parse import urlsplit

from score_mcp_servers import assess_server, assessment_rule_report
from score_mcp_servers.utils import HTTPTransport


class InvalidTarget(ValueError):
    pass


def public_addresses(url):
    try:
        parts = urlsplit(url)
        if (parts.scheme not in {'http', 'https'} or not parts.hostname
                or parts.username or parts.password or parts.fragment or parts.port == 0):
            raise ValueError()
        port = parts.port or (443 if parts.scheme == 'https' else 80)
    except ValueError:
        raise InvalidTarget('Enter an HTTP(S) MCP endpoint without credentials or a fragment.') from None
    addresses = sorted({entry[4][0] for entry in socket.getaddrinfo(
        parts.hostname, port, type=socket.SOCK_STREAM)})
    if not addresses:
        raise InvalidTarget('The MCP endpoint has no public address.')
    for address in addresses:
        ip = ipaddress.ip_address(address)
        if not ip.is_global or (isinstance(ip, ipaddress.IPv6Address) and ip.ipv4_mapped is not None):
            raise InvalidTarget('Use a publicly reachable MCP endpoint; private and local addresses are not supported.')
    return parts.hostname, port, addresses


class PublicHTTPTransport(HTTPTransport):
    """Pin every destination to public DNS while retaining Host/SNI/TLS validation."""
    def __init__(self, endpoint, *, timeout=5):
        super().__init__(endpoint, timeout=timeout)
        host, port, addresses = public_addresses(endpoint)
        self.destinations = {(host, port): addresses[0]}

    def request(self, label, method='POST', body=None, headers=None, **kwargs):
        target = kwargs.get('url') or self.endpoint
        parts = urlsplit(target)
        key = (parts.hostname, parts.port or (443 if parts.scheme == 'https' else 80))
        if key not in self.destinations:
            host, port, addresses = public_addresses(target)
            self.destinations[(host, port)] = addresses[0]
        kwargs['connect_ip'] = self.destinations[key]
        return super().request(label, method, body, headers, **kwargs)


def run(endpoint):
    transport = PublicHTTPTransport(endpoint, timeout=5)
    assessment = assess_server(endpoint, transport=transport, timeout=5, max_pages=3)
    report = assessment_rule_report(assessment)
    report.update(
        collection_status=assessment['evidence'].get('collection_status'),
        limitations=assessment.get('limitations', []),
    )
    return {'schema_version': '1.0', 'source': 'live', 'report': report}


def main():
    try:
        payload = json.loads(sys.stdin.read(8193))
        if not isinstance(payload, dict) or not isinstance(payload.get('endpoint'), str):
            raise InvalidTarget('Enter an HTTP(S) MCP endpoint.')
        result = run(payload['endpoint'])
    except (InvalidTarget, ValueError):
        result = {'error': {'status': 400, 'message': 'Enter a valid, publicly reachable HTTP(S) MCP endpoint without credentials or a fragment.'}}
    except socket.gaierror:
        result = {'error': {'status': 502, 'message': 'The MCP endpoint could not be resolved.'}}
    except Exception:
        # Do not leak target query secrets, exception traces, or local paths.
        result = {'error': {'status': 502, 'message': 'The MCP assessment could not be completed.'}}
    print(json.dumps(result, allow_nan=False, separators=(',', ':')))


if __name__ == '__main__':
    main()
