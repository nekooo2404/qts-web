import { Info } from "@phosphor-icons/react/dist/ssr";

export function DemoNotice({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-5 flex items-start gap-3 rounded-md bg-portal-highlight px-4 py-3 text-sm text-sky-950" role="note">
      <Info className="mt-0.5 shrink-0" size={19} weight="fill" />
      <p className="leading-6">{children}</p>
    </div>
  );
}
