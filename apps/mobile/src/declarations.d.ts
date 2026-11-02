declare module 'expo' {
  export function registerRootComponent(component: React.ComponentType<any>): void;
}

declare module '*.png' {
  const value: any;
  export default value;
}

declare module '*.jpg' {
  const value: any;
  export default value;
}
