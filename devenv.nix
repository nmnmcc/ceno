{
  pkgs,
  ...
}:

with pkgs;

{
  devcontainer.enable = true;

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
    settings.admins.admin = "password";
  };
}
