{
  pkgs,
  ...
}:

with pkgs;

{
  packages = [
    git
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
