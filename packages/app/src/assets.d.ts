/** Font and sound files the card imports as their URL; the bundler copies them out. */
declare module "*.woff2" {
  const url: string;
  export default url;
}

declare module "*.mp3" {
  const url: string;
  export default url;
}
