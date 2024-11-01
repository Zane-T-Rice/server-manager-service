(
    cd swagger
    redocly bundle serverManagerService.yaml > combinedServerManagerService.yaml
    git add combinedServerManagerService.yaml
    # Only commit if the file was actually staged by git add.
    if [ "$(git diff --name-only --cached | grep "combinedServerManagerService.yaml")" != "" ]; then
      git commit -m "Updated combinedServerManagerService.yaml"
    fi
)