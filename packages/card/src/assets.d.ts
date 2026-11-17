/** Font and sound files the bundler copies out, imported as their URL. */
declare module "*.woff2" {
  const url: string;
  export default url;
}

declare module "*.mp3" {
  const url: string;
  export default url;
}
