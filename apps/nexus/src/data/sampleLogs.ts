export interface LogEntry {
  timestamp: string;
  system: string;
  type: string;
  device: string;
  message: string;
  status: string;
  source: string;
  raw: any;
}

export const SAMPLE_LOGS: LogEntry[] = [
  {
    timestamp: "2025-11-10T00:03:15Z",
    system: "Lighting",
    type: "Info",
    device: "LGT-ZONE-A01",
    message: "Lighting system initialized – 42 nodes online",
    status: "OK",
    source: "Nexus Core",
    raw: { uptime: "99.9%", latency_ms: 12 }
  },
  {
    timestamp: "2025-11-10T00:05:47Z",
    system: "Audio",
    type: "Info",
    device: "AMP-GATE10",
    message: "Audio subsystem started – gain level preset 2",
    status: "OK",
    source: "Pulsar Engine",
    raw: { gain_db: -12, channels_active: 6 }
  },
  {
    timestamp: "2025-11-10T00:07:31Z",
    system: "HVAC",
    type: "Info",
    device: "HVAC-ZONE-A",
    message: "Temperature sensors calibrated (Setpoint 72°F)",
    status: "OK",
    source: "Environmental Controller",
    raw: { current_temp: 71.8, co2_ppm: 620 }
  },
  {
    timestamp: "2025-11-10T00:09:10Z",
    system: "LED",
    type: "Warning",
    device: "LED-A14",
    message: "Temperature threshold exceeded (89°C > limit 80°C)",
    status: "Active",
    source: "Display Node",
    raw: { temp: 89.2, power_draw_kw: 3.4, brightness_pct: 100 }
  },
  {
    timestamp: "2025-11-10T00:09:45Z",
    system: "AI",
    type: "Insight",
    device: "AI-ENGINE",
    message: "Predicted LED controller failure within 8 hours",
    status: "Predictive",
    source: "AI Engine",
    raw: { confidence: 0.82, related_device: "LED-A14" }
  },
  {
    timestamp: "2025-11-10T00:11:52Z",
    system: "Pulsar",
    type: "Info",
    device: "PLS-SCHED-A",
    message: "Workflow 'Morning Lighting Prep' scheduled for 04:00",
    status: "Queued",
    source: "Pulsar Scheduler",
    raw: { workflow_id: "WF-MORN-LGT", trigger: "cron(0 4 * * *)" }
  },
  {
    timestamp: "2025-11-10T00:15:04Z",
    system: "Nova",
    type: "Info",
    device: "NVA-SENSOR-13",
    message: "Crowd sensor online – zone population baseline 42",
    status: "OK",
    source: "Nova Analytics",
    raw: { density: 0.34, last_update_s: 2.5 }
  },
  {
    timestamp: "2025-11-10T00:22:31Z",
    system: "Security",
    type: "Diagnostic",
    device: "SEC-CTRL-01",
    message: "Badge reader calibration successful",
    status: "Resolved",
    source: "Access Control Node",
    raw: { door: "Service A", firmware: "3.1.9" }
  },
  {
    timestamp: "2025-11-10T00:29:57Z",
    system: "AI",
    type: "Insight",
    device: "AI-ENGINE",
    message: "Detected pattern: recurring LED overheating when Pulsar workflow 'Retail Ad Loop' runs > 3 hrs",
    status: "Predictive",
    source: "AI Diagnostics",
    raw: { confidence: 0.91, occurrences: 4 }
  },
  {
    timestamp: "2025-11-10T00:32:11Z",
    system: "Pulsar",
    type: "Error",
    device: "PLS-02",
    message: "Failed to start workflow 'Retail Ad Loop' – timeout on LED node A12",
    status: "Active",
    source: "Pulsar Controller",
    raw: { workflow: "Retail Ad Loop", step: 3, retry_in_s: 120 }
  },
  {
    timestamp: "2025-11-10T00:33:50Z",
    system: "LED",
    type: "Error",
    device: "LED-A12",
    message: "No response from LED node after 5 retries",
    status: "Active",
    source: "Display Controller",
    raw: { timeout_ms: 5000, retry_count: 5 }
  },
  {
    timestamp: "2025-11-10T00:34:02Z",
    system: "Lighting",
    type: "Info",
    device: "LGT-ZONE-A02",
    message: "Scene 'Night Mode' fade initiated (20% brightness)",
    status: "OK",
    source: "Nexus Core",
    raw: { fade_duration_s: 10, target_brightness: 0.2 }
  },
  {
    timestamp: "2025-11-10T00:36:41Z",
    system: "Nova",
    type: "Info",
    device: "NVA-SENSOR-09",
    message: "Flight update received – 5 arrivals in next hour",
    status: "OK",
    source: "Nova Data Engine",
    raw: { flights_inbound: 5, avg_delay_min: 8 }
  },
  {
    timestamp: "2025-11-10T00:39:27Z",
    system: "Audio",
    type: "Info",
    device: "AMP-GATE15",
    message: "Background music volume normalized (−6 dB)",
    status: "OK",
    source: "Pulsar Controller",
    raw: { gain_db: -6 }
  },
  {
    timestamp: "2025-11-10T00:42:09Z",
    system: "Lighting",
    type: "Warning",
    device: "LGT-ZONE-B01",
    message: "Power draw +15% above expected baseline",
    status: "Active",
    source: "Nexus Telemetry",
    raw: { watts: 4280, expected_watts: 3700 }
  },
  {
    timestamp: "2025-11-10T00:44:11Z",
    system: "AI",
    type: "Insight",
    device: "AI-ENGINE",
    message: "Suggested optimization: reduce Zone B brightness by 10%",
    status: "Advisory",
    source: "AI Assistant",
    raw: { predicted_savings_pct: 7.5 }
  },
  {
    timestamp: "2025-11-10T00:50:37Z",
    system: "HVAC",
    type: "Info",
    device: "HVAC-02",
    message: "Zone temperature stabilized (72°F)",
    status: "OK",
    source: "Environmental Controller",
    raw: { temp: 72, humidity: 41 }
  },
  {
    timestamp: "2025-11-10T00:59:51Z",
    system: "Security",
    type: "Error",
    device: "SEC-CTRL-02",
    message: "Camera feed dropped – reconnecting...",
    status: "Active",
    source: "Surveillance Node",
    raw: { stream_id: "CAM-GATE12", retries: 1 }
  },
  {
    timestamp: "2025-11-10T01:02:16Z",
    system: "Nova",
    type: "Warning",
    device: "NVA-SENSOR-08",
    message: "Telemetry latency 512 ms (above threshold)",
    status: "Active",
    source: "Nova Core",
    raw: { latency_ms: 512, threshold_ms: 300 }
  },
  {
    timestamp: "2025-11-10T01:03:05Z",
    system: "Pulsar",
    type: "Info",
    device: "PLS-SCHED-A",
    message: "Workflow 'Night Transition' completed successfully",
    status: "Resolved",
    source: "Pulsar Engine",
    raw: { duration_s: 45, steps_completed: 6 }
  },
  {
    timestamp: "2025-11-10T01:04:33Z",
    system: "AI",
    type: "Insight",
    device: "AI-ENGINE",
    message: "Detected anomaly: 17% mismatch between applied vs. target lighting state",
    status: "Predictive",
    source: "AI Diagnostics",
    raw: { affected_zones: ["A", "B"], confidence: 0.77 }
  },
  {
    timestamp: "2025-11-10T01:07:42Z",
    system: "LED",
    type: "Info",
    device: "LED-B07",
    message: "Playlist switched to Ad Block 03",
    status: "OK",
    source: "CMS Controller",
    raw: { playlist_id: "PL-RETAIL-03" }
  },
  {
    timestamp: "2025-11-10T01:10:28Z",
    system: "Lighting",
    type: "Error",
    device: "LGT-ZONE-C01",
    message: "No response from driver during ping test",
    status: "Active",
    source: "Telemetry Monitor",
    raw: { retries: 3, timeout_ms: 8000 }
  },
  {
    timestamp: "2025-11-10T01:12:40Z",
    system: "HVAC",
    type: "Warning",
    device: "HVAC-ZONE-C",
    message: "CO₂ level 920 ppm exceeds target 800 ppm",
    status: "Active",
    source: "Environmental Controller",
    raw: { co2_ppm: 920 }
  },
  {
    timestamp: "2025-11-10T01:15:13Z",
    system: "Nova",
    type: "Info",
    device: "NVA-FLIGHTS",
    message: "Updated arrivals manifest – 8 flights inbound",
    status: "OK",
    source: "Nova Data Engine",
    raw: { inbound_flights: 8 }
  },
  {
    timestamp: "2025-11-10T01:18:09Z",
    system: "Audio",
    type: "Info",
    device: "AMP-FOODCOURT-01",
    message: "Audio schedule 'Morning Playlist' queued for 05:00",
    status: "Queued",
    source: "Pulsar Scheduler",
    raw: { playlist: "Morning Playlist" }
  },
  {
    timestamp: "2025-11-10T01:21:17Z",
    system: "Lighting",
    type: "Info",
    device: "LGT-ZONE-B04",
    message: "Scene preset 'Maintenance' applied (40%)",
    status: "Resolved",
    source: "Nexus Core",
    raw: { brightness: 0.4 }
  },
  {
    timestamp: "2025-11-10T01:25:42Z",
    system: "AI",
    type: "Insight",
    device: "AI-ENGINE",
    message: "Correlated drop in audio channel activity with network latency spikes",
    status: "Predictive",
    source: "AI Analyzer",
    raw: { correlation_score: 0.88 }
  },
  {
    timestamp: "2025-11-10T01:28:55Z",
    system: "Nova",
    type: "Error",
    device: "NVA-SENSOR-03",
    message: "Lost sync with telemetry node (offline > 180s)",
    status: "Active",
    source: "Nova Core",
    raw: { last_seen_s: 183 }
  },
  {
    timestamp: "2025-11-10T01:32:17Z",
    system: "Security",
    type: "Diagnostic",
    device: "SEC-DOOR-A05",
    message: "Unauthorized badge scan detected (role mismatch)",
    status: "Active",
    source: "Access Control",
    raw: { badge_id: "STF-5548", role: "Maintenance" }
  },
  {
    timestamp: "2025-11-10T01:36:02Z",
    system: "LED",
    type: "Info",
    device: "LED-C03",
    message: "Brightness auto-adjusted for ambient light (−12%)",
    status: "OK",
    source: "Sensor Node",
    raw: { ambient_lux: 480, adjustment: -12 }
  },
  {
    timestamp: "2025-11-10T01:39:09Z",
    system: "AI",
    type: "Insight",
    device: "AI-ENGINE",
    message: "Learning model updated with 24h telemetry dataset",
    status: "OK",
    source: "AI Trainer",
    raw: { records_processed: 18421 }
  },
  {
    timestamp: "2025-11-10T01:42:47Z",
    system: "Pulsar",
    type: "Info",
    device: "PLS-03",
    message: "Triggered LED test pattern at Gate B for diagnostics",
    status: "Resolved",
    source: "Pulsar Automation",
    raw: { pattern: "TEST-BARS", duration_s: 30 }
  },
  {
    timestamp: "2025-11-10T01:47:23Z",
    system: "Lighting",
    type: "Warning",
    device: "LGT-ZONE-D01",
    message: "Flicker detected on dimmer channel 7",
    status: "Active",
    source: "Telemetry Monitor",
    raw: { channel: 7, ripple_v: 3.2 }
  },
  {
    timestamp: "2025-11-10T01:50:31Z",
    system: "Security",
    type: "Info",
    device: "SEC-CAM-A11",
    message: "Motion detection sensitivity recalibrated",
    status: "Resolved",
    source: "Surveillance Node",
    raw: { threshold: 0.42 }
  },
  {
    timestamp: "2025-11-10T01:53:02Z",
    system: "HVAC",
    type: "Info",
    device: "HVAC-ZONE-E",
    message: "Filter replacement due in 72 hours",
    status: "Scheduled",
    source: "Maintenance Scheduler",
    raw: { filter_life_h: 72 }
  },
  {
    timestamp: "2025-11-10T01:57:33Z",
    system: "LED",
    type: "Warning",
    device: "LED-D04",
    message: "Display synchronization drift 280 ms",
    status: "Active",
    source: "LED Controller",
    raw: { sync_offset_ms: 280 }
  },
  {
    timestamp: "2025-11-10T02:00:12Z",
    system: "AI",
    type: "Insight",
    device: "AI-ENGINE",
    message: "Predicted air handling failure Zone D within 12 hrs",
    status: "Predictive",
    source: "AI Diagnostics",
    raw: { confidence: 0.74, related_device: "HVAC-D01" }
  },
  {
    timestamp: "2025-11-10T02:04:19Z",
    system: "Nova",
    type: "Info",
    device: "NVA-FLIGHTS",
    message: "Departures manifest synced – 4 flights delayed",
    status: "OK",
    source: "Nova Data Engine",
    raw: { flights_total: 22, flights_delayed: 4 }
  },
  {
    timestamp: "2025-11-10T02:06:47Z",
    system: "Lighting",
    type: "Info",
    device: "LGT-ZONE-F",
    message: "Scene 'Pre-Dawn Ramp' active (60%)",
    status: "OK",
    source: "Pulsar Engine",
    raw: { brightness_pct: 60 }
  }
];
