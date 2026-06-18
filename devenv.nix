{
  pkgs,
  ...
}:

with pkgs;

{
  devcontainer.enable = true;

  packages = [
    git
    fish
  ];

  languages.javascript = {
    enable = true;
    package = nodejs-slim_24;
    yarn = {
      enable = true;
      package = yarn-berry_4;
    };
  };
}
