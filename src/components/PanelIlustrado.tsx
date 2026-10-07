import familia from "../assets/familia.webp";

// Grano de papel en SVG (feTurbulence) para que el dibujo parezca hecho sobre papel
const GRANO_PAPEL = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 .35 0 0 0 0 .28 0 0 0 0 .18 0 0 0 .45 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`;

// Mitad ilustrada: el dibujo a lápiz sobre papel cálido, como página de álbum
export function PanelIlustrado() {
  return (
    <aside className="sticky top-0 hidden h-screen flex-col overflow-hidden bg-[#efe6d5] text-[#3b2f24] lg:flex">
      <div
        className="pointer-events-none absolute inset-0 opacity-50 mix-blend-multiply"
        style={{ backgroundImage: GRANO_PAPEL }}
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_45%,transparent_50%,rgb(110_80_45/0.22))]" />
      <div className="pointer-events-none absolute inset-6 rounded-[3px] border border-[#3b2f24]/15" />

      <div className="relative px-14 pt-16 animate-in fade-in duration-700 motion-reduce:animate-none xl:px-20 xl:pt-20">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#3b2f24]/60">Empresa familiar</p>
        <p className="mt-5 font-serif text-4xl leading-[1.15] font-normal">
          Cuidamos a su familia <em className="block italic">como a la nuestra.</em>
        </p>
      </div>

      <div className="relative min-h-0 flex-1 px-12 pt-6 pb-10">
        <div className="absolute inset-x-[18%] bottom-9 h-8 rounded-[50%] bg-[#3b2f24]/20 blur-xl" />
        <img
          src={familia}
          alt="Dibujo a lápiz de la familia"
          className="relative h-full w-full object-contain object-bottom mix-blend-multiply animate-in fade-in slide-in-from-bottom-4 duration-1000 motion-reduce:animate-none"
        />
      </div>
    </aside>
  );
}
