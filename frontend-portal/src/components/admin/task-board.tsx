"use client";

import {
  ArrowLeft,
  ArrowRight,
  CalendarBlank,
  Check,
  DotsSixVertical,
  Kanban,
  MagnifyingGlass,
  UserCircle,
  X,
} from "@phosphor-icons/react";
import { useMemo, useState } from "react";

import {
  INITIAL_TASKS,
  TASK_COLUMNS,
  type DemoTask,
  type TaskPriority,
  type TaskStatus,
} from "@/lib/demo/admin-data";

const PRIORITY_LABEL: Record<TaskPriority, string> = {
  HIGH: "Ưu tiên cao",
  MEDIUM: "Trung bình",
  LOW: "Ưu tiên thấp",
};

const PRIORITY_CLASS: Record<TaskPriority, string> = {
  HIGH: "bg-red-50 text-red-700",
  MEDIUM: "bg-portal-warning text-amber-900",
  LOW: "bg-slate-100 text-slate-600",
};

function adjacentStatus(status: TaskStatus, direction: -1 | 1): TaskStatus | null {
  const index = TASK_COLUMNS.findIndex((column) => column.id === status);
  return TASK_COLUMNS[index + direction]?.id ?? null;
}

export function TaskBoard() {
  const [tasks, setTasks] = useState<DemoTask[]>(INITIAL_TASKS);
  const [query, setQuery] = useState("");
  const [priority, setPriority] = useState<"ALL" | TaskPriority>("ALL");
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<TaskStatus | null>(null);
  const [announcement, setAnnouncement] = useState<string | null>(null);

  const visibleTasks = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("vi-VN");
    return tasks.filter((task) => {
      const matchesQuery =
        !normalizedQuery ||
        [task.id, task.title, task.project, task.assignee]
          .join(" ")
          .toLocaleLowerCase("vi-VN")
          .includes(normalizedQuery);
      const matchesPriority = priority === "ALL" || task.priority === priority;
      return matchesQuery && matchesPriority;
    });
  }, [priority, query, tasks]);

  function moveTask(taskId: string, status: TaskStatus) {
    const task = tasks.find((item) => item.id === taskId);
    if (!task || task.status === status) return;

    const columnLabel = TASK_COLUMNS.find((column) => column.id === status)?.label ?? status;
    setTasks((current) =>
      current.map((item) => (item.id === taskId ? { ...item, status } : item)),
    );
    setAnnouncement(`Đã chuyển “${task.title}” sang ${columnLabel}.`);
  }

  return (
    <section className="min-w-0">
      <div className="mb-5 flex flex-col gap-3 border-y border-slate-200 bg-white px-4 py-4 sm:flex-row sm:items-end sm:justify-between sm:px-5">
        <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-[minmax(14rem,1fr)_12rem] lg:max-w-2xl">
          <label>
            <span className="mb-1.5 block text-xs font-semibold text-slate-600">Tìm công việc</span>
            <span className="relative block">
              <MagnifyingGlass
                aria-hidden
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                size={18}
              />
              <input
                className="portal-field pl-10"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Mã, dự án, người phụ trách..."
                type="search"
                value={query}
              />
            </span>
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-semibold text-slate-600">Mức ưu tiên</span>
            <select
              className="portal-field"
              onChange={(event) => setPriority(event.target.value as "ALL" | TaskPriority)}
              value={priority}
            >
              <option value="ALL">Tất cả mức độ</option>
              <option value="HIGH">Ưu tiên cao</option>
              <option value="MEDIUM">Trung bình</option>
              <option value="LOW">Ưu tiên thấp</option>
            </select>
          </label>
        </div>
        <p className="text-xs leading-5 text-slate-500">
          Kéo thẻ giữa các cột hoặc dùng nút mũi tên trên từng thẻ.
        </p>
      </div>

      {announcement ? (
        <div
          className="mb-4 flex items-center gap-2 rounded-md bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800"
          role="status"
        >
          <Check className="shrink-0" size={18} weight="bold" />
          <span className="min-w-0 flex-1">{announcement}</span>
          <button
            aria-label="Đóng thông báo"
            className="grid size-7 shrink-0 place-items-center rounded-sm hover:bg-black/5"
            onClick={() => setAnnouncement(null)}
            type="button"
          >
            <X size={15} />
          </button>
        </div>
      ) : null}

      <div className="portal-scrollbar grid min-w-0 gap-4 overflow-x-auto pb-2 lg:grid-cols-3 lg:overflow-visible">
        {TASK_COLUMNS.map((column) => {
          const columnTasks = visibleTasks.filter((task) => task.status === column.id);
          const isTarget = dropTarget === column.id && draggedTaskId !== null;

          return (
            <section
              aria-label={`${column.label}, ${columnTasks.length} công việc`}
              className={`min-h-[28rem] min-w-[18rem] border-t-2 bg-slate-50 px-3 pb-4 pt-3 transition-colors sm:min-w-[20rem] lg:min-w-0 ${
                isTarget ? "border-portal-brand bg-portal-highlight/45" : "border-slate-300"
              }`}
              key={column.id}
              onDragEnter={(event) => {
                event.preventDefault();
                setDropTarget(column.id);
              }}
              onDragOver={(event) => event.preventDefault()}
              onDragLeave={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                  setDropTarget(null);
                }
              }}
              onDrop={(event) => {
                event.preventDefault();
                const taskId = event.dataTransfer.getData("text/plain") || draggedTaskId;
                if (taskId) moveTask(taskId, column.id);
                setDraggedTaskId(null);
                setDropTarget(null);
              }}
            >
              <header className="mb-3 flex min-h-14 items-start justify-between gap-3 border-b border-slate-200 pb-3">
                <div>
                  <h2 className="text-sm font-bold text-slate-950">{column.label}</h2>
                  <p className="mt-1 text-xs leading-5 text-slate-500">{column.description}</p>
                </div>
                <span className="portal-data grid size-7 shrink-0 place-items-center rounded-md bg-white text-xs font-bold text-slate-700">
                  {columnTasks.length}
                </span>
              </header>

              <div className="space-y-3">
                {columnTasks.length === 0 ? (
                  <div className="grid min-h-40 place-items-center border border-dashed border-slate-300 bg-white px-4 text-center">
                    <div>
                      <Kanban className="mx-auto text-slate-400" size={30} weight="duotone" />
                      <p className="mt-2 text-sm font-semibold text-slate-700">Cột đang trống</p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        Kéo một công việc vào đây hoặc xóa bộ lọc hiện tại.
                      </p>
                    </div>
                  </div>
                ) : (
                  columnTasks.map((task) => {
                    const previousStatus = adjacentStatus(task.status, -1);
                    const nextStatus = adjacentStatus(task.status, 1);

                    return (
                      <article
                        className={`cursor-grab bg-white p-4 shadow-[0_5px_16px_-14px_rgba(15,23,42,0.75)] outline outline-1 outline-slate-200 transition-[opacity,transform] duration-150 ease-out hover:-translate-y-0.5 hover:outline-slate-300 active:cursor-grabbing ${
                          draggedTaskId === task.id ? "opacity-45" : "opacity-100"
                        }`}
                        draggable
                        key={task.id}
                        onDragEnd={() => {
                          setDraggedTaskId(null);
                          setDropTarget(null);
                        }}
                        onDragStart={(event) => {
                          event.dataTransfer.effectAllowed = "move";
                          event.dataTransfer.setData("text/plain", task.id);
                          setDraggedTaskId(task.id);
                        }}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="portal-data text-[11px] font-semibold text-slate-500">{task.id}</p>
                            <h3 className="mt-1 break-words text-sm font-bold leading-5 text-slate-950">
                              {task.title}
                            </h3>
                          </div>
                          <DotsSixVertical
                            aria-label="Có thể kéo thả công việc"
                            className="mt-0.5 shrink-0 text-slate-400"
                            size={19}
                            weight="bold"
                          />
                        </div>

                        <p className="mt-3 border-t border-slate-100 pt-3 text-xs font-medium text-portal-brand">
                          {task.project}
                        </p>

                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <span className={`rounded-md px-2 py-1 text-[11px] font-semibold ${PRIORITY_CLASS[task.priority]}`}>
                            {PRIORITY_LABEL[task.priority]}
                          </span>
                          <span className="flex items-center gap-1 text-[11px] text-slate-500">
                            <CalendarBlank size={14} />
                            {task.dueDate}
                          </span>
                        </div>

                        <div className="mt-4 flex items-end justify-between gap-3 border-t border-slate-100 pt-3">
                          <span className="flex min-w-0 items-center gap-1.5 text-xs text-slate-600">
                            <UserCircle className="shrink-0" size={17} weight="duotone" />
                            <span className="truncate">{task.assignee}</span>
                          </span>
                          <span className="flex shrink-0 gap-1">
                            <button
                              aria-label={`Chuyển ${task.title} sang cột trước`}
                              className="hvr-icon-back grid size-10 place-items-center rounded-md border border-slate-200 text-slate-600 hover:bg-portal-highlight hover:text-portal-brand disabled:cursor-not-allowed disabled:opacity-35"
                              disabled={!previousStatus}
                              onClick={() => previousStatus && moveTask(task.id, previousStatus)}
                              title="Chuyển sang cột trước"
                              type="button"
                            >
                              <ArrowLeft className="hvr-icon" size={17} weight="bold" />
                            </button>
                            <button
                              aria-label={`Chuyển ${task.title} sang cột sau`}
                              className="hvr-icon-forward grid size-10 place-items-center rounded-md border border-slate-200 text-slate-600 hover:bg-portal-highlight hover:text-portal-brand disabled:cursor-not-allowed disabled:opacity-35"
                              disabled={!nextStatus}
                              onClick={() => nextStatus && moveTask(task.id, nextStatus)}
                              title="Chuyển sang cột sau"
                              type="button"
                            >
                              <ArrowRight className="hvr-icon" size={17} weight="bold" />
                            </button>
                          </span>
                        </div>
                      </article>
                    );
                  })
                )}
              </div>
            </section>
          );
        })}
      </div>
    </section>
  );
}
