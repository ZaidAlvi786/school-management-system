import { NextRequest, NextResponse } from "next/server";
import { networkInterfaces } from "os";

export async function GET(request: NextRequest) {
  try {
    const interfaces = networkInterfaces();
    const localIPs: string[] = [];

    // Find all non-internal IPv4 addresses
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name] || []) {
        // Skip internal (loopback) and non-IPv4 addresses
        if (iface.family === "IPv4" && !iface.internal) {
          localIPs.push(iface.address);
        }
      }
    }

    // Get the first non-localhost IP (usually the WiFi IP)
    const networkIP = localIPs[0] || null;
    const configuredIP = process.env.LOCAL_NETWORK_IP || null;
    const recommendedIP = configuredIP || networkIP;

    return NextResponse.json({
      networkIP,
      configuredIP,
      allIPs: localIPs,
      recommendedIP,
      port: 3000,
      url: recommendedIP ? `http://${recommendedIP}:3000` : null,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

