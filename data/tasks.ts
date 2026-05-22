import { CalendarDays, CheckCircle2, Clock3, FileText, LayoutList, PencilLine, ShieldCheck } from "lucide-react-native";
import type { ComponentType } from "react";

export type TaskStatus = "completed" | "in-progress" | "pending";

export type Task = {
  id: string;
  title: string;
  time: string;
  status: TaskStatus;
  priority: "Low" | "Medium" | "High";
  project: string;
  dueDate: string;
  flag: "green" | "gray" | "blue" | "red";
  description: string;
  subtasks: {
    title: string;
    done: boolean;
  }[];
};

export const tasks: Task[] = [
  {
    id: "design-landing-page",
    title: "Design landing page",
    time: "9:00 AM",
    status: "in-progress",
    priority: "Medium",
    project: "Website Redesign",
    dueDate: "May 24, 2026",
    flag: "green",
    description: "Create a modern and minimal landing page according to the new brand guidelines.",
    subtasks: [
      { title: "Create wireframe", done: true },
      { title: "Design hero section", done: true },
      { title: "Design features section", done: false },
      { title: "Add responsive layout", done: false }
    ]
  },
  {
    id: "review-project-proposal",
    title: "Review project proposal",
    time: "11:00 AM",
    status: "pending",
    priority: "Low",
    project: "Website Redesign",
    dueDate: "May 25, 2026",
    flag: "gray",
    description: "Read the proposal draft and leave concise comments for the product team.",
    subtasks: [
      { title: "Read introduction", done: true },
      { title: "Check timeline", done: false },
      { title: "Send comments", done: false }
    ]
  },
  {
    id: "update-task-tracker-ui",
    title: "Update task tracker UI",
    time: "1:00 PM",
    status: "pending",
    priority: "Medium",
    project: "Internal Tools",
    dueDate: "May 26, 2026",
    flag: "gray",
    description: "Refresh task cards, filters, and the bottom navigation for the mobile tracker.",
    subtasks: [
      { title: "Audit existing screens", done: true },
      { title: "Prepare components", done: false },
      { title: "Ship polish pass", done: false }
    ]
  },
  {
    id: "team-stand-up-meeting",
    title: "Team stand-up meeting",
    time: "3:00 PM",
    status: "pending",
    priority: "High",
    project: "Operations",
    dueDate: "May 22, 2026",
    flag: "red",
    description: "Share blockers, priorities, and handoffs with the design and engineering teams.",
    subtasks: [
      { title: "Prepare notes", done: false },
      { title: "Join meeting", done: false }
    ]
  },
  {
    id: "write-documentation",
    title: "Write documentation",
    time: "5:00 PM",
    status: "pending",
    priority: "Low",
    project: "Internal Tools",
    dueDate: "May 27, 2026",
    flag: "blue",
    description: "Document the new task statuses, list filters, and project progress states.",
    subtasks: [
      { title: "Draft outline", done: false },
      { title: "Add screenshots", done: false },
      { title: "Request review", done: false }
    ]
  }
];

export const projectTasks = [
  tasks[0],
  {
    ...tasks[1],
    id: "create-style-guide",
    title: "Create style guide",
    time: "10:00 AM",
    status: "completed" as const,
    flag: "green" as const
  },
  {
    ...tasks[2],
    id: "develop-pages",
    title: "Develop pages",
    time: "2:00 PM"
  },
  {
    ...tasks[4],
    id: "testing-qa",
    title: "Testing & QA",
    time: "4:00 PM",
    priority: "High" as const
  }
];

export const stats = [
  {
    label: "Total Tasks",
    value: "8",
    tone: "green" as const,
    icon: CheckCircle2
  },
  {
    label: "Completed",
    value: "5",
    tone: "blue" as const,
    icon: ShieldCheck
  },
  {
    label: "Pending",
    value: "3",
    tone: "orange" as const,
    icon: Clock3
  }
];

export const overviewItems: {
  label: string;
  value: string;
  icon: ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
}[] = [
  { label: "Timeline", value: "May 22-31", icon: CalendarDays },
  { label: "Scope", value: "4 tracked tasks", icon: LayoutList },
  { label: "Brief", value: "Minimal, friendly redesign", icon: FileText },
  { label: "Design", value: "Landing flow first", icon: PencilLine }
];
