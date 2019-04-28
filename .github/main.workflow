workflow "Electron Build" {
  resolves = ["Electron Builder"]
  on = "push"
}

action "Electron Builder" {
  uses = "docker://electronuserland/builder"
  secrets = ["GITHUB_TOKEN"]
  args = "yarn && GH_TOKEN=$GITHUB_TOKEN yarn build"
}
