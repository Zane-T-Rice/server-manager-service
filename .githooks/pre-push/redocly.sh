(
    cd swagger
    redocly bundle serverManagerService.yaml > combinedServerManagerService.yaml
    git add combinedServerManagerService.yaml
    git commit -m "Updated combinedServerManagerService.yaml"
)