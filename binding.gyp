{
  "targets": [
    {
      "target_name": "disable_peek",
      "sources": ["electron/native_modules/disable_peek.cpp"],
      "dependencies": [
        "<!(node -p \"require('node-addon-api').targets\"):node_addon_api_except"
      ]
    },
    {
      "target_name": "win-control",
      "sources": ["electron/native_modules/win-control.cpp"],
      "dependencies": [
        "<!(node -p \"require('node-addon-api').targets\"):node_addon_api_except"
      ]
    }
  ]
}