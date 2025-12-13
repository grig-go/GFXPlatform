import { useState, useEffect } from "react";
import {
  Grid3x3,
  Settings,
  HelpCircle,
  Wrench,
  Moon,
  Sun,
  LogOut,
  User,
  FileText,
  Sparkles,
  Eye,
  ExternalLink,
} from "lucide-react";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { supabase } from "@/lib/supabase";
import { SupportRequestDialog } from "./SupportRequestDialog";

interface TopBarProps {
  onOpenConfig?: () => void;
}

export function TopBar({ onOpenConfig }: TopBarProps) {
  const [darkMode, setDarkMode] = useState(false);
  const [showSupportDialog, setShowSupportDialog] = useState(false);
  const [apps, setApps] = useState<
    Array<{
      id: string;
      name: string;
      app_url: string;
      sort_order: number;
      app_key: string;
    }>
  >([]);

  // Initialize dark mode from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("pulsar-hub-theme");
    if (stored === "dark") {
      setDarkMode(true);
      document.documentElement.classList.add("dark");
    }
  }, []);

  // Fetch apps from backend
  useEffect(() => {
    const fetchApps = async () => {
      const { data, error } = await supabase.rpc("list_active_applications");

      if (!error && data) {
        console.log("Applications fetched from backend:", data);
        setApps(data);
      } else if (error) {
        console.error("Failed to fetch applications:", error);
      }
    };

    fetchApps();
  }, []);

  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    if (newMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("pulsar-hub-theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("pulsar-hub-theme", "light");
    }
  };

  return (
    <div className="sticky top-0 z-50 border-b bg-card shadow-md px-6 py-2.5">
      <div className="flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity">
          <svg
            className="h-6 text-[rgb(0,0,0)] dark:text-slate-100"
            viewBox="0 0 1185 176"
            xmlns="http://www.w3.org/2000/svg"
            aria-label="EMERGENT"
          >
            <g transform="translate(0,176) scale(0.1,-0.1)" fill="currentColor">
              {/* E */}
              <path d="M712 1377 l-122 -122 0 -498 0 -497 570 0 570 0 0 135 0 135 -435 0 -435 0 0 110 0 110 350 0 350 0 0 130 0 130 -350 0 -350 0 0 110 0 110 435 0 435 0 0 135 0 135 -448 0 -447 0 -123 -123z" />
              {/* M */}
              <path d="M1860 880 l0 -620 135 0 135 0 2 412 3 411 210 -251 c160 -192 212 -249 220 -239 6 8 100 122 210 255 l200 242 3 -415 2 -415 130 0 130 0 0 620 0 620 -137 0 -138 -1 -205 -249 c-192 -234 -206 -249 -221 -232 -9 9 -103 122 -208 250 l-192 232 -140 0 -139 0 0 -620z" />
              {/* E */}
              <path d="M3450 880 l0 -620 570 0 570 0 0 135 0 135 -435 0 -435 0 0 110 0 110 350 0 350 0 0 130 0 130 -350 0 -350 0 0 110 0 110 435 0 435 0 0 135 0 135 -570 0 -570 0 0 -620z" />
              {/* R */}
              <path d="M4760 880 l0 -620 130 0 130 0 0 205 0 205 174 0 174 0 171 -205 171 -205 135 0 135 0 0 48 c0 46 -4 51 -130 202 l-129 155 43 7 c63 9 110 34 152 80 66 74 69 88 69 333 l0 220 -30 55 c-33 60 -96 114 -153 130 -23 6 -224 10 -539 10 l-503 0 0 -620z m960 205 l0 -145 -350 0 -350 0 0 145 0 145 350 0 350 0 0 -145z" />
              {/* G */}
              <path d="M6315 1476 c-28 -12 -65 -40 -84 -61 -68 -77 -66 -65 -66 -535 0 -470 -2 -458 66 -535 19 -21 56 -49 84 -61 50 -24 51 -24 465 -24 396 0 417 1 460 21 60 27 98 64 126 124 23 49 24 57 24 313 l0 262 -265 0 -265 0 0 -135 0 -135 135 0 135 0 0 -90 0 -90 -350 0 -350 0 0 350 0 350 350 0 350 0 0 -50 0 -50 130 0 130 0 0 88 c0 134 -46 214 -150 261 -43 20 -64 21 -460 21 -414 0 -415 0 -465 -24z" />
              {/* E */}
              <path d="M7590 880 l0 -620 565 0 565 0 0 135 0 135 -435 0 -436 0 3 108 3 107 348 3 347 2 0 130 0 130 -347 2 -348 3 -3 108 -3 107 436 0 435 0 0 135 0 135 -565 0 -565 0 0 -620z" />
              {/* N */}
              <path d="M8890 880 l0 -620 130 0 130 0 0 411 c0 234 4 409 9 407 5 -1 161 -186 347 -410 l338 -408 138 0 138 0 0 620 0 620 -135 0 -135 0 -2 -410 -3 -410 -340 410 -340 410 -137 0 -138 0 0 -620z" />
              {/* T */}
              <path d="M10250 1365 l0 -135 240 0 240 0 0 -485 0 -485 135 0 135 0 0 485 0 485 125 0 c69 0 125 3 125 8 0 4 -57 65 -128 135 l-127 127 -373 0 -372 0 0 -135z" />
            </g>
          </svg>
          <div className="h-6 w-6 sm:h-7 sm:w-7 rounded-[8px] sm:rounded-[10px] bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center flex-shrink-0">
            <span className="text-white text-[11px] sm:text-xs font-bold sm:text-[15px]">P</span>
          </div>
          <span className="text-[rgb(0,0,0)] dark:text-slate-100 font-semibold text-lg">
            Pulsar
          </span>
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-1">
          {/* Apps selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="text-[rgb(0,0,0)] dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 gap-2"
              >
                <Grid3x3 className="w-4 h-4" />
                Apps
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
              {apps.length > 0 ? (
                apps.map((app) => (
                  <DropdownMenuItem
                    key={app.id}
                    className="text-slate-700 dark:text-slate-100 cursor-pointer"
                    onClick={() => {
                      console.log("App clicked:", app.name, "navigating to:", app.app_url);
                      window.open(app.app_url, "_blank");
                    }}
                  >
                    {app.name}
                  </DropdownMenuItem>
                ))
              ) : (
                <DropdownMenuItem className="text-slate-400 dark:text-slate-500" disabled>
                  No apps available
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Tools */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="text-[rgb(0,0,0)] dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 gap-2"
              >
                <Wrench className="w-4 h-4" />
                Tools
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 w-56">
              <DropdownMenuLabel className="text-slate-500 dark:text-slate-400">
                Utilities
              </DropdownMenuLabel>
              <DropdownMenuItem
                className="text-slate-700 dark:text-slate-100 cursor-pointer"
                onClick={onOpenConfig}
              >
                <Eye className="w-4 h-4 mr-2" />
                Configure Dashboard
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-slate-400 dark:text-slate-500 cursor-not-allowed"
                disabled
              >
                <FileText className="w-4 h-4 mr-2" />
                System Logs
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-slate-400 dark:text-slate-500 cursor-not-allowed"
                disabled
              >
                <Sparkles className="w-4 h-4 mr-2" />
                AI Assistant
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Settings */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="text-[rgb(0,0,0)] dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 gap-2"
              >
                <Settings className="w-4 h-4" />
                Settings
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 w-56"
            >
              <DropdownMenuLabel className="text-slate-500 dark:text-slate-400">
                Preferences
              </DropdownMenuLabel>
              <DropdownMenuItem
                onClick={toggleDarkMode}
                className="text-slate-700 dark:text-slate-100 cursor-pointer"
              >
                {darkMode ? (
                  <>
                    <Sun className="w-4 h-4 mr-2" />
                    Light Mode
                  </>
                ) : (
                  <>
                    <Moon className="w-4 h-4 mr-2" />
                    Dark Mode
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-slate-200 dark:bg-slate-700" />
              <DropdownMenuItem
                className="text-slate-400 dark:text-slate-500 cursor-not-allowed"
                disabled
              >
                <User className="w-4 h-4 mr-2" />
                Account Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-slate-200 dark:bg-slate-700" />
              <DropdownMenuItem className="text-red-600 dark:text-red-400 cursor-pointer">
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Help */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="text-[rgb(0,0,0)] dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 gap-2"
              >
                <HelpCircle className="w-4 h-4" />
                Help
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 w-56"
            >
              <DropdownMenuItem
                className="text-slate-700 dark:text-slate-100 cursor-pointer"
                onClick={() =>
                  window.open(
                    import.meta.env.DEV
                      ? "http://localhost:3000/docs/apps/pulsar-gfx"
                      : "/docs/apps/pulsar-gfx",
                    "_blank"
                  )
                }
              >
                <HelpCircle className="w-4 h-4 mr-2" />
                Documentation
                <ExternalLink className="ml-auto h-3 w-3 text-slate-400" />
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-slate-200 dark:bg-slate-700" />
              <DropdownMenuItem
                className="text-slate-700 dark:text-slate-100 cursor-pointer"
                onClick={() => setShowSupportDialog(true)}
              >
                <HelpCircle className="w-4 h-4 mr-2" />
                Contact Support
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User Icon */}
          <Button
            variant="ghost"
            size="icon"
            className="text-[rgb(0,0,0)] dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <User className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Support Dialog */}
      <SupportRequestDialog
        open={showSupportDialog}
        onOpenChange={setShowSupportDialog}
      />
    </div>
  );
}
