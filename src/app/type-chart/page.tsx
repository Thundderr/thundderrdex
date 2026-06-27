import { TypeChart } from "@/components/type-chart/TypeChart";
import Link from "next/link";

export const metadata = {
  title: "Type Chart | Thundderrdex",
  description: "Complete Pokemon type effectiveness chart",
};

export default function TypeChartPage() {
  return (
    <div className="min-h-[100dvh] bg-slate-950 p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Link
            href="/"
            className="text-slate-400 hover:text-white transition-colors"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
          </Link>
          <h1 className="text-fluid-2xl font-bold text-white">
            Type Effectiveness Chart
          </h1>
        </div>

        <div className="bg-slate-900 rounded-lg border border-slate-800 p-4 md:p-6">
          <TypeChart />
        </div>

        <div className="mt-6 text-sm text-slate-400">
          <p>
            This chart shows how effective each attacking type (rows) is against
            each defending type (columns).
          </p>
          <p className="mt-2">
            For dual-type Pokemon, multiply the effectiveness values together.
            For example, a Fire move against a Grass/Steel Pokemon would be 2x ×
            2x = 4x damage.
          </p>
        </div>
      </div>
    </div>
  );
}
