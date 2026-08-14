"use client";

import {
  Check,
  EnvelopeSimple,
  MagnifyingGlass,
  PencilSimple,
  Plus,
  Trash,
  UserPlus,
  UsersThree,
  WarningCircle,
  X,
} from "@phosphor-icons/react";
import { type FormEvent, useMemo, useRef, useState } from "react";

import {
  INITIAL_EMPLOYEES,
  PERMISSION_COLUMNS,
  type EmployeeRecord,
  type EmployeeRole,
  type PermissionKey,
} from "@/lib/demo/admin-data";

type Feedback = { kind: "success" | "error"; text: string } | null;

const EMPTY_EMPLOYEE_FORM = {
  name: "",
  email: "",
  department: "Kinh doanh",
  role: "EMPLOYEE" as EmployeeRole,
};

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((part) => part[0])
    .join("")
    .toLocaleUpperCase("vi-VN");
}

export function EmployeeManagement() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [employees, setEmployees] = useState<EmployeeRecord[]>(INITIAL_EMPLOYEES);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"ALL" | EmployeeRole>("ALL");
  const [form, setForm] = useState(EMPTY_EMPLOYEE_FORM);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [dialogError, setDialogError] = useState<string | null>(null);

  const filteredEmployees = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("vi-VN");
    return employees.filter((employee) => {
      const matchesQuery =
        !normalizedQuery ||
        [employee.name, employee.email, employee.department, employee.id]
          .join(" ")
          .toLocaleLowerCase("vi-VN")
          .includes(normalizedQuery);
      const matchesRole = roleFilter === "ALL" || employee.role === roleFilter;
      return matchesQuery && matchesRole;
    });
  }, [employees, query, roleFilter]);

  function openDialog() {
    setFeedback(null);
    setDialogError(null);
    dialogRef.current?.showModal();
  }

  function closeDialog() {
    dialogRef.current?.close();
    setForm(EMPTY_EMPLOYEE_FORM);
    setDialogError(null);
  }

  function togglePermission(employeeId: string, permission: PermissionKey) {
    setEmployees((current) =>
      current.map((employee) =>
        employee.id === employeeId
          ? {
              ...employee,
              permissions: {
                ...employee.permissions,
                [permission]: !employee.permissions[permission],
              },
            }
          : employee,
      ),
    );
    setFeedback({ kind: "success", text: "Đã cập nhật quyền trong phiên dữ liệu minh họa." });
  }

  function changeRole(employeeId: string) {
    setEmployees((current) =>
      current.map((employee) => {
        if (employee.id !== employeeId) return employee;
        const role: EmployeeRole = employee.role === "ADMIN" ? "EMPLOYEE" : "ADMIN";
        return {
          ...employee,
          role,
          permissions:
            role === "ADMIN"
              ? { contracts: true, cms: true, employees: true, tasks: true }
              : { ...employee.permissions, employees: false },
        };
      }),
    );
    setFeedback({ kind: "success", text: "Vai trò đã được đổi trong phiên dữ liệu minh họa." });
  }

  function deleteEmployee(employee: EmployeeRecord) {
    const confirmed = window.confirm(`Xóa ${employee.name} khỏi danh sách minh họa?`);
    if (!confirmed) return;

    setEmployees((current) => current.filter((item) => item.id !== employee.id));
    setFeedback({ kind: "success", text: `Đã xóa ${employee.name} khỏi dữ liệu minh họa.` });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedEmail = form.email.trim().toLocaleLowerCase("vi-VN");

    if (employees.some((employee) => employee.email.toLocaleLowerCase("vi-VN") === normalizedEmail)) {
      setDialogError("Email này đã có trong danh sách nhân sự. Hãy dùng một email công việc khác.");
      return;
    }

    const nextNumber =
      Math.max(0, ...employees.map((employee) => Number(employee.id.split("-")[1]) || 0)) + 1;
    const permissions =
      form.role === "ADMIN"
        ? { contracts: true, cms: true, employees: true, tasks: true }
        : { contracts: true, cms: false, employees: false, tasks: true };

    setEmployees((current) => [
      {
        id: `QTS-${String(nextNumber).padStart(3, "0")}`,
        name: form.name.trim(),
        email: normalizedEmail,
        department: form.department,
        role: form.role,
        status: "INVITED",
        permissions,
      },
      ...current,
    ]);
    setFeedback({
      kind: "success",
      text: "Đã thêm nhân sự ở trạng thái chờ nhận lời mời. Không có email thật được gửi.",
    });
    closeDialog();
  }

  return (
    <>
      <section className="portal-surface min-w-0 overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-slate-200 p-4 sm:p-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-[minmax(14rem,1fr)_12rem] lg:max-w-2xl">
            <label className="min-w-0">
              <span className="mb-1.5 block text-xs font-semibold text-slate-600">Tìm nhân sự</span>
              <span className="relative block">
                <MagnifyingGlass
                  aria-hidden
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                  size={18}
                />
                <input
                  className="portal-field pl-10"
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Tên, email, phòng ban..."
                  type="search"
                  value={query}
                />
              </span>
            </label>
            <label>
              <span className="mb-1.5 block text-xs font-semibold text-slate-600">Vai trò</span>
              <select
                className="portal-field"
                onChange={(event) => setRoleFilter(event.target.value as "ALL" | EmployeeRole)}
                value={roleFilter}
              >
                <option value="ALL">Tất cả vai trò</option>
                <option value="EMPLOYEE">Nhân viên</option>
                <option value="ADMIN">Quản trị viên</option>
              </select>
            </label>
          </div>
          <button className="portal-btn portal-btn-primary hvr-icon-grow" onClick={openDialog} type="button">
            <Plus className="hvr-icon" size={18} weight="bold" />
            Thêm nhân viên
          </button>
        </div>

        {feedback ? (
          <div
            className={`mx-4 mt-4 flex items-start gap-2 rounded-md px-3 py-2.5 text-sm sm:mx-5 ${
              feedback.kind === "error" ? "bg-red-50 text-red-800" : "bg-emerald-50 text-emerald-800"
            }`}
            role={feedback.kind === "error" ? "alert" : "status"}
          >
            {feedback.kind === "error" ? (
              <WarningCircle className="mt-0.5 shrink-0" size={18} weight="fill" />
            ) : (
              <Check className="mt-0.5 shrink-0" size={18} weight="bold" />
            )}
            <span className="min-w-0 flex-1">{feedback.text}</span>
            <button
              aria-label="Đóng thông báo"
              className="grid size-6 shrink-0 place-items-center rounded-sm hover:bg-black/5"
              onClick={() => setFeedback(null)}
              type="button"
            >
              <X size={15} />
            </button>
          </div>
        ) : null}

        {filteredEmployees.length === 0 ? (
          <div className="grid min-h-72 place-items-center p-6 text-center">
            <div className="max-w-sm">
              <UsersThree className="mx-auto text-slate-400" size={42} weight="duotone" />
              <h2 className="mt-4 text-base font-bold text-slate-900">Không tìm thấy nhân sự phù hợp</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Thử đổi từ khóa hoặc chọn lại bộ lọc vai trò để xem toàn bộ danh sách.
              </p>
              <button
                className="portal-btn portal-btn-secondary mt-4"
                onClick={() => {
                  setQuery("");
                  setRoleFilter("ALL");
                }}
                type="button"
              >
                Xóa bộ lọc
              </button>
            </div>
          </div>
        ) : (
          <div className="portal-scrollbar overflow-x-auto">
            <table className="table portal-table min-w-[76rem]">
              <caption className="sr-only">Danh sách nhân sự và quyền truy cập minh họa</caption>
              <thead>
                <tr className="border-slate-200 bg-slate-50 text-xs uppercase text-slate-600">
                  <th className="px-5 py-3.5">Nhân sự</th>
                  <th className="px-4 py-3.5">Phòng ban</th>
                  <th className="px-4 py-3.5">Vai trò</th>
                  {PERMISSION_COLUMNS.map((permission) => (
                    <th className="px-3 py-3.5 text-center" key={permission.key}>
                      {permission.label}
                    </th>
                  ))}
                  <th className="px-5 py-3.5 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.map((employee) => (
                  <tr className="border-slate-200" key={employee.id}>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-portal-highlight text-xs font-bold text-portal-brand">
                          {getInitials(employee.name)}
                        </span>
                        <span className="min-w-0">
                          <span className="block font-semibold text-slate-900">{employee.name}</span>
                          <span className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
                            <EnvelopeSimple size={14} />
                            {employee.email}
                          </span>
                          <span className="portal-data mt-1 block text-[11px] text-slate-400">
                            {employee.id}
                          </span>
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-700">{employee.department}</td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col items-start gap-1.5">
                        <button
                          aria-label={`Đổi vai trò của ${employee.name}. Hiện tại: ${
                            employee.role === "ADMIN" ? "Quản trị viên" : "Nhân viên"
                          }`}
                          className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors hover:brightness-95 ${
                            employee.role === "ADMIN"
                              ? "bg-portal-brand text-white"
                              : "bg-slate-100 text-slate-700"
                          }`}
                          onClick={() => changeRole(employee.id)}
                          type="button"
                        >
                          {employee.role === "ADMIN" ? "Quản trị viên" : "Nhân viên"}
                        </button>
                        <span
                          className={`text-[11px] font-medium ${
                            employee.status === "ACTIVE" ? "text-emerald-700" : "text-amber-700"
                          }`}
                        >
                          {employee.status === "ACTIVE" ? "Đang hoạt động" : "Chờ nhận lời mời"}
                        </span>
                      </div>
                    </td>
                    {PERMISSION_COLUMNS.map((permission) => (
                      <td className="px-3 py-4 text-center" key={permission.key}>
                        <label className="inline-flex min-h-11 cursor-pointer items-center justify-center px-2">
                          <span className="sr-only">
                            Cho phép {employee.name} truy cập {permission.label}
                          </span>
                          <input
                            aria-label={`Cho phép ${employee.name} truy cập ${permission.label}`}
                            checked={employee.permissions[permission.key]}
                            className="toggle toggle-sm border-slate-400 bg-slate-200 text-portal-brand checked:border-portal-brand checked:bg-portal-brand"
                            onChange={() => togglePermission(employee.id, permission.key)}
                            type="checkbox"
                          />
                        </label>
                      </td>
                    ))}
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-1">
                        <button
                          aria-label={`Đổi vai trò của ${employee.name}`}
                          className="hvr-icon-grow grid size-11 place-items-center rounded-md text-slate-600 hover:bg-portal-highlight hover:text-portal-brand"
                          onClick={() => changeRole(employee.id)}
                          title="Đổi vai trò"
                          type="button"
                        >
                          <PencilSimple className="hvr-icon" size={19} />
                        </button>
                        <button
                          aria-label={`Xóa ${employee.name}`}
                          className="hvr-icon-shrink grid size-11 place-items-center rounded-md text-red-700 hover:bg-red-50 hover:text-red-800"
                          onClick={() => deleteEmployee(employee)}
                          title="Xóa khỏi danh sách"
                          type="button"
                        >
                          <Trash className="hvr-icon" size={19} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex flex-col gap-1 border-t border-slate-200 px-4 py-3 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <span>Hiển thị {filteredEmployees.length} nhân sự</span>
          <span>Thay đổi chỉ tồn tại trong phiên trình duyệt</span>
        </div>
      </section>

      <dialog
        aria-labelledby="employee-dialog-title"
        className="m-auto w-[calc(100%-2rem)] max-w-xl rounded-lg bg-transparent p-0 backdrop:bg-portal-brand/60"
        onCancel={(event) => {
          event.preventDefault();
          closeDialog();
        }}
        ref={dialogRef}
      >
        <div className="animate__animated animate__zoomIn portal-surface max-h-[calc(100dvh-2rem)] overflow-y-auto p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
            <div>
              <h2 className="text-xl font-bold text-slate-950" id="employee-dialog-title">
                Thêm nhân viên
              </h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Tạo bản ghi minh họa và cấu hình quyền mặc định theo vai trò.
              </p>
            </div>
            <button
              aria-label="Đóng hộp thoại"
              className="grid size-11 shrink-0 place-items-center rounded-md text-slate-600 hover:bg-slate-100"
              onClick={closeDialog}
              type="button"
            >
              <X size={20} />
            </button>
          </div>

          <form className="mt-5 grid gap-4" onSubmit={handleSubmit}>
            <label>
              <span className="mb-1.5 block text-sm font-semibold text-slate-800">Họ và tên</span>
              <input
                autoComplete="name"
                autoFocus
                className="portal-field"
                minLength={2}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                required
                value={form.name}
              />
            </label>

            <label>
              <span className="mb-1.5 block text-sm font-semibold text-slate-800">Email công việc</span>
              <input
                autoComplete="email"
                className="portal-field"
                onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                placeholder="ho.ten@qts.com.vn"
                required
                type="email"
                value={form.email}
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label>
                <span className="mb-1.5 block text-sm font-semibold text-slate-800">Phòng ban</span>
                <select
                  className="portal-field"
                  onChange={(event) =>
                    setForm((current) => ({ ...current, department: event.target.value }))
                  }
                  value={form.department}
                >
                  <option>Kinh doanh</option>
                  <option>Pháp chế</option>
                  <option>Truyền thông</option>
                  <option>Vận hành</option>
                  <option>Công nghệ</option>
                </select>
              </label>

              <label>
                <span className="mb-1.5 block text-sm font-semibold text-slate-800">Vai trò</span>
                <select
                  className="portal-field"
                  onChange={(event) =>
                    setForm((current) => ({ ...current, role: event.target.value as EmployeeRole }))
                  }
                  value={form.role}
                >
                  <option value="EMPLOYEE">Nhân viên</option>
                  <option value="ADMIN">Quản trị viên</option>
                </select>
              </label>
            </div>

            <div className="rounded-md bg-portal-highlight px-4 py-3 text-sm leading-6 text-sky-950">
              {form.role === "ADMIN"
                ? "Quản trị viên được bật sẵn toàn bộ quyền trong bản minh họa."
                : "Nhân viên được bật quyền Hợp đồng và Công việc; quản trị viên có thể chỉnh lại trong bảng."}
            </div>

            {dialogError ? (
              <div className="flex items-start gap-2 rounded-md bg-red-50 px-3 py-2.5 text-sm text-red-800" role="alert">
                <WarningCircle className="mt-0.5 shrink-0" size={18} weight="fill" />
                <span>{dialogError}</span>
              </div>
            ) : null}

            <div className="mt-2 flex flex-col-reverse gap-2 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
              <button className="portal-btn portal-btn-secondary" onClick={closeDialog} type="button">
                Hủy
              </button>
              <button className="portal-btn portal-btn-primary hvr-icon-grow" type="submit">
                <UserPlus className="hvr-icon" size={18} weight="bold" />
                Thêm vào danh sách
              </button>
            </div>
          </form>
        </div>
      </dialog>
    </>
  );
}
