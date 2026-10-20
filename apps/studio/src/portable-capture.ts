import type { ActivityEvent } from './activity.ts';
import type { PortableSceneId } from './portable-scenes.ts';

export type CaptureController = {
  load(events: ActivityEvent[], scene: PortableSceneId): void;
  frame(time: number): void;
};

declare global {
  interface Window { agentopiaCapture?: CaptureController }
}

// CSS animations and SVG SMIL use separate clocks from JavaScript timers.
// Pause both so screenshot/encoding speed cannot change the exported animation.
export function createFrameClock() {
  const births = new WeakMap<Animation, number>();
  return (time: number) => {
    document.querySelectorAll<SVGSVGElement>('svg').forEach((svg) => {
      svg.pauseAnimations();
      svg.setCurrentTime(time / 1000);
    });
    document.getAnimations().forEach((animation) => {
      if (!births.has(animation)) births.set(animation, time);
      animation.pause();
      animation.currentTime = time - births.get(animation)!;
    });
  };
}
