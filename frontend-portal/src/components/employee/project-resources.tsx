"use client";

import {
  CheckCircle,
  DownloadSimple,
  FileArchive,
  FileZip,
  FolderOpen,
  MagnifyingGlass,
  SpinnerGap,
  WarningCircle,
} from "@phosphor-icons/react";
import { useDeferredValue, useMemo, useState } from "react";

import type {
  DemoProjectResource,
  ProjectResourceFormat,
} from "@/lib/demo/employee-data";

type DownloadState =
  | { resourceId: string; status: "downloading" }
  | { resourceId: string; status: "success" }
  | { resourceId: string; status: "error"; message: string }
  | null;

const PROJECT_DATE_FORMATTER = new Intl.DateTimeFormat("vi-VN", {
  dateStyle: "medium",
  timeZone: "Asia/Ho_Chi_Minh",
});

function formatDate(value: string): string {
  return PROJECT_DATE_FORMATTER.format(new Date(value));
}

function normalizeSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("vi-VN")
    .trim();
}

function createDemoArchive(
  project: DemoProjectResource,
  resource: DemoProjectResource["resources"][number],
): Blob {
  const content = [
    "QTS INTERNAL PORTAL - DEMO DOWNLOAD",
    "",
    "This is a generated placeholder file for UI verification.",
    "It is not a production ZIP or RAR archive and contains no customer data.",
    "",
    `Project: ${project.projectName}`,
    `Client label: ${project.clientName}`,
    `Resource: ${resource.label}`,
    `Version: ${resource.version}`,
    `Expected filename: ${resource.fileName}`,
  ].join("\r\n");

  return new Blob([content], { type: "application/octet-stream" });
}

function triggerDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.hidden = true;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function ResourceIcon({ format }: { format: ProjectResourceFormat }) {
  const Icon = format === "zip" ? FileZip : FileArchive;
  return (
    <span className="grid size-10 shrink-0 place-items-center rounded-md bg-[var(--color-paper-muted)] text-portal-brand">
      <Icon aria-hidden size={21} weight="fill" />
    </span>
  );
}

interface ProjectResourcesProps {
  projects: readonly DemoProjectResource[];
}

export function ProjectResources({ projects }: ProjectResourcesProps) {
  const [query, setQuery] = useState("");
  const [downloadState, setDownloadState] = useState<DownloadState>(null);
  const deferredQuery = useDeferredValue(query);

  const filteredProjects = useMemo(() => {
    const normalizedQuery = normalizeSearch(deferredQuery);
    if (!normalizedQuery) return projects;

    return projects.filter((project) =>
      normalizeSearch(
        [project.projectName, project.clientName, project.description, project.owner].join(" "),
      ).includes(normalizedQuery),
    );
  }, [deferredQuery, projects]);

  async function downloadResource(
    project: DemoProjectResource,
    resource: DemoProjectResource["resources"][number],
  ) {
    setDownloadState({ resourceId: resource.id, status: "downloading" });

    try {
      await new Promise<void>((resolve) => window.setTimeout(resolve, 350));
      const blob = createDemoArchive(project, resource);
      triggerDownload(blob, resource.fileName);
      setDownloadState({ resourceId: resource.id, status: "success" });
    } catch {
      setDownloadState({
        resourceId: resource.id,
        status: "error",
        message: "Trình duyệt không thể tạo tệp mẫu. Hãy thử lại.",
      });
    }
  }

  if (projects.length === 0) {
    return (
      <section className="portal-surface flex min-h-72 flex-col items-center justify-center px-5 py-10 text-center" aria-live="polite">
        <FolderOpen aria-hidden className="text-[var(--color-ink-muted)]" size={34} />
        <h2 className="mt-3 text-base font-bold text-[var(--color-ink)]">Chưa có tài nguyên dự án</h2>
        <p className="mt-1 max-w-[52ch] text-sm leading-6 text-[var(--color-ink-muted)]">
          Tài nguyên được phân công sẽ xuất hiện tại đây khi API dự án được kết nối.
        </p>
      </section>
    );
  }

  return (
    <section aria-labelledby="resource-list-heading">
      <div className="mb-5 max-w-xl">
        <label className="mb-1.5 block text-sm font-semibold text-[var(--color-ink)]" htmlFor="project-search">
          Tìm dự án
        </label>
        <div className="relative">
          <MagnifyingGlass
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-muted)]"
            size={19}
          />
          <input
            className="portal-field pl-10"
            id="project-search"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tên dự án, đơn vị, nhóm phụ trách..."
            type="search"
            value={query}
          />
        </div>
      </div>

      <div className="mb-3 flex min-h-8 flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-bold text-[var(--color-ink)]" id="resource-list-heading">
          Dự án được phân công
        </h2>
        <output className="portal-data text-xs text-[var(--color-ink-muted)]" aria-live="polite">
          {filteredProjects.length} / {projects.length} dự án minh họa
        </output>
      </div>

      {downloadState?.status === "success" ? (
        <div className="mb-4 flex items-start gap-3 rounded-md bg-[var(--color-success-soft)] px-4 py-3 text-sm text-[var(--color-success)]" role="status">
          <CheckCircle aria-hidden className="mt-0.5 shrink-0" size={19} weight="fill" />
          <p className="leading-6">Đã tạo tệp placeholder minh họa trên thiết bị của bạn.</p>
        </div>
      ) : null}

      {downloadState?.status === "error" ? (
        <div className="mb-4 flex flex-col gap-3 rounded-md bg-[var(--color-danger-soft)] px-4 py-3 text-sm text-[var(--color-danger)] sm:flex-row sm:items-center sm:justify-between" role="alert">
          <span className="flex items-start gap-3">
            <WarningCircle aria-hidden className="mt-0.5 shrink-0" size={19} weight="fill" />
            <span className="leading-6">{downloadState.message}</span>
          </span>
          <button className="portal-btn portal-btn-secondary self-start sm:self-auto" onClick={() => setDownloadState(null)} type="button">
            Đóng
          </button>
        </div>
      ) : null}

      {filteredProjects.length === 0 ? (
        <div className="portal-surface flex min-h-64 flex-col items-center justify-center px-5 py-10 text-center">
          <MagnifyingGlass aria-hidden className="text-[var(--color-ink-muted)]" size={30} />
          <h3 className="mt-3 text-base font-bold text-[var(--color-ink)]">Không tìm thấy dự án</h3>
          <p className="mt-1 max-w-[48ch] text-sm leading-6 text-[var(--color-ink-muted)]">
            Kiểm tra từ khóa hoặc xóa nội dung tìm kiếm để xem lại danh sách.
          </p>
          <button className="portal-btn portal-btn-secondary mt-4" onClick={() => setQuery("")} type="button">
            Xóa tìm kiếm
          </button>
        </div>
      ) : (
        <ul className="space-y-4">
          {filteredProjects.map((project) => (
            <li className="portal-surface overflow-hidden" key={project.id}>
              <div className="grid gap-4 border-b border-[var(--color-rule)] bg-[var(--color-paper-muted)] px-4 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start sm:px-5">
                <div className="min-w-0">
                  <h3 className="break-words text-lg font-bold text-[var(--color-ink)]">{project.projectName}</h3>
                  <p className="mt-1 text-sm leading-6 text-[var(--color-ink-muted)]">{project.description}</p>
                </div>
                <dl className="grid grid-cols-2 gap-x-5 gap-y-2 text-xs sm:text-right">
                  <div>
                    <dt className="font-semibold text-[var(--color-ink-muted)]">Đơn vị</dt>
                    <dd className="mt-1 text-[var(--color-ink)]">{project.clientName}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-[var(--color-ink-muted)]">Cập nhật</dt>
                    <dd className="portal-data mt-1 whitespace-nowrap text-[var(--color-ink)]">{formatDate(project.updatedAt)}</dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="font-semibold text-[var(--color-ink-muted)]">Phụ trách</dt>
                    <dd className="mt-1 text-[var(--color-ink)]">{project.owner}</dd>
                  </div>
                </dl>
              </div>

              <ul className="divide-y divide-[var(--color-rule)]">
                {project.resources.map((resource) => {
                  const isDownloading = downloadState?.resourceId === resource.id && downloadState.status === "downloading";
                  const didSucceed = downloadState?.resourceId === resource.id && downloadState.status === "success";

                  return (
                    <li className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:px-5" key={resource.id}>
                      <div className="flex min-w-0 flex-1 items-start gap-3">
                        <ResourceIcon format={resource.format} />
                        <div className="min-w-0">
                          <p className="font-semibold text-[var(--color-ink)]">{resource.label}</p>
                          <p className="portal-data mt-1 break-all text-xs text-[var(--color-ink-muted)]">{resource.fileName}</p>
                          <p className="mt-1 text-xs text-[var(--color-ink-muted)]">{resource.version} · {resource.sizeLabel}</p>
                        </div>
                      </div>
                      <button
                        className="portal-btn portal-btn-secondary hvr-icon-drop w-full sm:w-auto"
                        disabled={isDownloading}
                        onClick={() => void downloadResource(project, resource)}
                        type="button"
                      >
                        {isDownloading ? (
                          <SpinnerGap aria-hidden className="animate-spin" size={19} />
                        ) : didSucceed ? (
                          <CheckCircle aria-hidden className="hvr-icon" size={19} weight="fill" />
                        ) : (
                          <DownloadSimple aria-hidden className="hvr-icon" size={19} />
                        )}
                        {isDownloading ? "Đang tạo tệp..." : didSucceed ? "Tải lại" : `Tải .${resource.format}`}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ul>
      )}

      <p className="sr-only" aria-live="polite">
        {downloadState?.status === "downloading" ? "Đang tạo tệp tải xuống minh họa." : ""}
      </p>
    </section>
  );
}
