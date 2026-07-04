import { join } from "node:path";
import {
  SPRINT_IDS,
  findRepoRoot,
  isMainModule,
  readJsonFile,
  writeJsonFile,
} from "./config";

export type EngineeringTaskStatus = "pending" | "completed" | "failed";

export interface EngineeringTask {
  id: string;
  sprint: string;
  title: string;
  status: EngineeringTaskStatus;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  failedAt?: string;
  error?: string;
}

export interface TaskState {
  generatedAt: string;
  tasks: EngineeringTask[];
}

function taskStatePath(repoRoot: string): string {
  return join(repoRoot, "engineeringos", "reports", "task-state.json");
}

function readTaskState(repoRoot: string): TaskState {
  return readJsonFile<TaskState>(taskStatePath(repoRoot)) ?? {
    generatedAt: new Date().toISOString(),
    tasks: [],
  };
}

function persistTaskState(repoRoot: string, state: TaskState): TaskState {
  const nextState = {
    ...state,
    generatedAt: new Date().toISOString(),
  };
  writeJsonFile(taskStatePath(repoRoot), nextState);
  return nextState;
}

export function addTask(task: Omit<EngineeringTask, "createdAt" | "updatedAt" | "status"> & {
  status?: EngineeringTaskStatus;
}, repoRoot = findRepoRoot()): EngineeringTask {
  const state = readTaskState(repoRoot);
  const existing = state.tasks.find((item) => item.id === task.id);

  if (existing) {
    return existing;
  }

  const now = new Date().toISOString();
  const nextTask: EngineeringTask = {
    ...task,
    status: task.status ?? "pending",
    createdAt: now,
    updatedAt: now,
  };

  state.tasks.push(nextTask);
  persistTaskState(repoRoot, state);
  return nextTask;
}

export function completeTask(id: string, repoRoot = findRepoRoot()): EngineeringTask | null {
  const state = readTaskState(repoRoot);
  const task = state.tasks.find((item) => item.id === id);

  if (!task) {
    return null;
  }

  const now = new Date().toISOString();
  task.status = "completed";
  task.updatedAt = now;
  task.completedAt = now;
  delete task.error;
  delete task.failedAt;
  persistTaskState(repoRoot, state);
  return task;
}

export function failTask(id: string, error: string, repoRoot = findRepoRoot()): EngineeringTask | null {
  const state = readTaskState(repoRoot);
  const task = state.tasks.find((item) => item.id === id);

  if (!task) {
    return null;
  }

  const now = new Date().toISOString();
  task.status = "failed";
  task.updatedAt = now;
  task.failedAt = now;
  task.error = error;
  persistTaskState(repoRoot, state);
  return task;
}

export function listTasks(repoRoot = findRepoRoot()): EngineeringTask[] {
  return readTaskState(repoRoot).tasks;
}

export function syncSprintTasks(repoRoot = findRepoRoot()): TaskState {
  for (const sprint of SPRINT_IDS) {
    addTask(
      {
        id: `${sprint.toLowerCase()}-implementation`,
        sprint,
        title: `${sprint} implementation evidence`,
        status: "completed",
      },
      repoRoot
    );
    completeTask(`${sprint.toLowerCase()}-implementation`, repoRoot);
  }

  return readTaskState(repoRoot);
}

if (isMainModule(import.meta.url)) {
  const state = syncSprintTasks();
  console.log(JSON.stringify(state, null, 2));
}
