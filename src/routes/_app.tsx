import { Link, Outlet, createFileRoute, useLocation } from "@tanstack/react-router";
import {
  ActivityIcon,
  BarChart3Icon,
  CloudSunIcon,
  CompassIcon,
  FileBarChartIcon,
  MapPinIcon,
  SettingsIcon,
} from "lucide-react";

import { Separator } from "@/components/ui/separator";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

const navigation = [
  {
    title: "Overview",
    items: [
      { title: "Dashboard", url: "/dashboard", icon: BarChart3Icon },
      { title: "Explore", url: "/explore", icon: CompassIcon },
      { title: "Locations", url: "/locations", icon: MapPinIcon },
      { title: "Reports", url: "/reports", icon: FileBarChartIcon },
    ],
  },
  {
    title: "Preferences",
    items: [{ title: "Settings", url: "/settings", icon: SettingsIcon }],
  },
];

function AppLayout() {
  const location = useLocation();

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader className="p-4">
          <Link to="/dashboard" className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <CloudSunIcon className="size-5" />
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="font-semibold">Weather Trends</span>
              <span className="text-xs text-muted-foreground">Historical weather analytics</span>
            </div>
          </Link>
        </SidebarHeader>

        <SidebarContent>
          {navigation.map((group) => (
            <SidebarGroup key={group.title}>
              <SidebarGroupLabel>{group.title}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {group.items.map((item) => (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton
                        render={
                          <Link to={item.url}>
                            <item.icon />
                            <span>{item.title}</span>
                          </Link>
                        }
                        isActive={
                          location.pathname === item.url ||
                          (item.url !== "/dashboard" &&
                            location.pathname.startsWith(`${item.url}/`))
                        }></SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </SidebarContent>

        <SidebarFooter className="p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <ActivityIcon className="size-4" />
            powered by Open-Meteo
          </div>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <span className="text-sm font-medium">
            {navigation
              .flatMap((group) => group.items)
              .find((item) => item.url === location.pathname)?.title ?? "Weather Trends"}
          </span>
        </header>

        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
