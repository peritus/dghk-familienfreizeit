{
  description = "Development environment for dghk-familienfreizeit";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs = { nixpkgs, ... }:
    let
      systems = [
        "x86_64-linux"
        "aarch64-linux"
        "x86_64-darwin"
        "aarch64-darwin"
      ];
    in {
      devShells = nixpkgs.lib.genAttrs systems (system: {
        default = let
          pkgs = nixpkgs.legacyPackages.${system};
        in pkgs.mkShell {
          packages = [ pkgs.nodejs_22 ] ++ pkgs.lib.optional pkgs.stdenv.hostPlatform.isLinux pkgs.chromium;
          shellHook = pkgs.lib.optionalString pkgs.stdenv.hostPlatform.isLinux ''
            export PLAYWRIGHT_EXECUTABLE_PATH="$(command -v chromium)"
          '';
        };
      });
    };
}
