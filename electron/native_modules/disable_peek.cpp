#pragma comment (lib, "Dwmapi")
#include "napi.h"
#include <format>

#include <dwmapi.h>

HWND UnpackWindow(Napi::Buffer<void *> wndHandle) {
  uint64_t handle = *reinterpret_cast<uint64_t*>(wndHandle.Data());
  HWND hwnd = (HWND)handle;

  return hwnd;
}

void DisablePeek(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();

  if (!info[0].IsBuffer()) {
    throw Napi::Error::New(env, "Argument must a window buffer");
  }

  HWND hwnd = UnpackWindow(info[0].As<Napi::Buffer<void*>>());
  
  const BOOL bExclude = true;
  DWMNCRENDERINGPOLICY t = DWMNCRP_ENABLED;
  DWMFLIP3DWINDOWPOLICY flip3d = DWMFLIP3D_EXCLUDEABOVE;

  HRESULT res;
  res = DwmSetWindowAttribute(hwnd, DWMWINDOWATTRIBUTE::DWMWA_EXCLUDED_FROM_PEEK, &bExclude, sizeof(bExclude));
  res = DwmSetWindowAttribute(hwnd, DWMWINDOWATTRIBUTE::DWMWA_DISALLOW_PEEK, &bExclude, sizeof(bExclude));
  res = DwmSetWindowAttribute(hwnd, DWMWINDOWATTRIBUTE::DWMWA_NCRENDERING_POLICY, &t, sizeof(t));
  res = DwmSetWindowAttribute(hwnd, DWMWINDOWATTRIBUTE::DWMWA_TRANSITIONS_FORCEDISABLED, &bExclude, sizeof(bExclude));
  res = DwmSetWindowAttribute(hwnd, DWMWINDOWATTRIBUTE::DWMWA_ALLOW_NCPAINT, &bExclude, sizeof(bExclude));
  res = DwmSetWindowAttribute(hwnd, DWMWINDOWATTRIBUTE::DWMWA_NONCLIENT_RTL_LAYOUT, &bExclude, sizeof(bExclude));
  res = DwmSetWindowAttribute(hwnd, DWMWINDOWATTRIBUTE::DWMWA_FLIP3D_POLICY, &flip3d, sizeof(flip3d));
}

Napi::Object Init(Napi::Env env, Napi::Object exports) {
  exports.Set(
    Napi::String::New(env, "disablePeek"),
    Napi::Function::New(env, DisablePeek)
  );

  return exports;
}

NODE_API_MODULE(disable_peek, Init)