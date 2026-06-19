{
  pkgs,
  ...
}:

with pkgs;

{
  packages = [
    curl
    git
  ];

  languages.javascript = {
    enable = true;
    package = nodejs-slim_24;
    corepack.enable = true;
  };

  services.couchdb = {
    enable = true;
  };
}
