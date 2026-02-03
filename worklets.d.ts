/* eslint-disable @typescript-eslint/no-explicit-any */

export {};

declare global {
  var __callMicrotasks: (() => void) | undefined;
  var _microtaskQueueFinalizers: Array<() => void>;
  var _scheduleHostFunctionOnJS:
    | ((fun: (...args: any[]) => any, args?: any[]) => void)
    | undefined;
  var _scheduleRemoteFunctionOnJS:
    | ((fun: (...args: any[]) => any, args?: any[]) => void)
    | undefined;
}
