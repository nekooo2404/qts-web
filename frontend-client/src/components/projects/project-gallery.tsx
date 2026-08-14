import Image from "next/image";

import { projects } from "@/data/site-content";

interface ProjectGalleryProps {
  compact?: boolean;
}

export function ProjectGallery({ compact = false }: ProjectGalleryProps) {
  return (
    <div className="grid gap-x-6 gap-y-10 md:grid-cols-12 lg:gap-x-8">
      {projects.map((project, index) => {
        const isLead = index === 0;

        return (
          <article
            key={project.id}
            className={[
              "group min-w-0 border-b border-qts-border pb-7",
              isLead ? "md:col-span-7 md:row-span-2" : "md:col-span-5",
            ].join(" ")}
          >
            <figure
              className={`${project.filterClass} relative overflow-hidden bg-qts-primary ${
                isLead && !compact ? "aspect-[4/3] md:aspect-[7/6]" : "aspect-[8/5]"
              }`}
            >
              <Image
                src={project.imageUrl}
                alt={project.imageAlt}
                fill
                sizes={isLead ? "(min-width: 768px) 58vw, 100vw" : "(min-width: 768px) 42vw, 100vw"}
                className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.025]"
              />
            </figure>
            <div className={isLead && !compact ? "pt-6" : "pt-5"}>
              <p className="text-xs font-semibold uppercase text-qts-primary">
                {project.category}
              </p>
              <h2
                className={`display-wrap mt-2 font-semibold leading-tight text-qts-deep ${
                  isLead && !compact ? "text-2xl sm:text-3xl" : "text-xl sm:text-2xl"
                }`}
              >
                {project.title}
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-qts-muted sm:text-base sm:leading-7">
                {project.description}
              </p>
            </div>
          </article>
        );
      })}
    </div>
  );
}
