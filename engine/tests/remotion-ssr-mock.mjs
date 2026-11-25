// Minimal Remotion stand-in for headless SSR of the real renderer components.
// It provides exactly the API surface src/ uses (see grep "from 'remotion'"):
// AbsoluteFill, Img, staticFile, delayRender/continueRender/cancelRender,
// useCurrentFrame and useVideoConfig.  The current frame is driven by the test
// through setFrame so every scene frame is exercised like Remotion would.
// Plain React.createElement — this module is loaded untranspiled.
import React from 'react';

const fill = (tag) => (props) => {
  const {style, children, ...rest} = props || {};
  return React.createElement(tag, {...rest, style}, children);
};

export const AbsoluteFill = fill('div');
export const Img = fill('img');

export const staticFile = (p) => String(p);
export const delayRender = () => 0;
export const continueRender = () => {};
export const cancelRender = () => {};
export const registerRoot = () => {};
export const Composition = () => null;
export const Series = () => null;

let frame = 0;
export const setFrame = (f) => { frame = f; };
export const useCurrentFrame = () => frame;
export const useVideoConfig = () => ({fps: 24, width: 1920, height: 1080, durationInFrames: 99999});
