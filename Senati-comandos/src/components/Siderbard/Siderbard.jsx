"use client";

import * as React from "react";
import {
  AudioWaveform,
  BookOpen,
  Bot,
  Command,
  Frame,
  GalleryVerticalEnd,
  Map,
  PieChart,
  Settings2,
  SquareTerminal,
} from "lucide-react";


import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";
import { TeamSwitcher } from "./Team-Switcher";
import { NavMain } from "./Nav-Main";
import { NavUser } from "./Nav-User";
import { NavProjects } from "./Nav-projects";

// This is sample data.
const data = {
  user: {
    name: "Administrador",
    email: "admin@senati.pe",
    avatar: "/avatars/shadcn.jpg",
  },
  teams: [
    {
      name: "SENATI",
      logo: GalleryVerticalEnd,
      plan: "Cobranza",
    }
  ],
  navMain: [
    {
      title: "Módulos",
      url: "#",
      icon: SquareTerminal,
      isActive: true,
      items: [
        {
          title: "Cobros CIS",
          url: "/",
        },
        {
          title: "Administrativo",
          url: "/administrativo",
        },
      ],
    },
    {
      title: "Académico",
      url: "#",
      icon: BookOpen,
      items: [
        {
          title: "Verificar Nota de sustentación",
          url: "/academico/verificar-nota",
        },
      ],
    },
    {
      title: "Configuración",
      url: "#",
      icon: Settings2,
      items: [
        {
          title: "General",
          url: "#",
        },
      ],
    },
  ],
  projects: [],
};

export function AppSidebar({ ...props }) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={data.teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavProjects projects={data.projects} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
