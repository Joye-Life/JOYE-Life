import { requireAdmin } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import type { BetaApplication } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function ApplicationsPage() {
  const { user, role } = await requireAdmin();
  const { data, error } = await createAdminClient()
    .from("beta_applications")
    .select("id,full_name,email,primary_focus,expected_frequency,status,created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  const applications = (data ?? []) as Pick<
    BetaApplication,
    "id" | "full_name" | "email" | "primary_focus" | "expected_frequency" | "status" | "created_at"
  >[];

  return (
    <section className="shell py-10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Admin</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight">Beta applications</h1>
          <p className="mt-2 text-sm text-black/50">Signed in as {user.email} · {role}</p>
        </div>
        <a className="button-secondary" href="/dashboard">Back to dashboard</a>
      </div>

      {error && (
        <p className="mt-6 rounded-2xl bg-red-50 p-4 text-sm text-red-700">
          Applications could not be loaded: {error.message}
        </p>
      )}

      <div className="card mt-8 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-mist text-black/50">
              <tr>
                <th className="p-4">Applicant</th>
                <th className="p-4">Focus</th>
                <th className="p-4">Usage</th>
                <th className="p-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {applications.length ? applications.map((application) => (
                <tr key={application.id} className="border-t border-black/5">
                  <td className="p-4">
                    <p className="font-semibold">{application.full_name}</p>
                    <a className="text-black/45 hover:text-black" href={`mailto:${application.email}`}>
                      {application.email}
                    </a>
                  </td>
                  <td className="p-4">{application.primary_focus}</td>
                  <td className="p-4">{application.expected_frequency}</td>
                  <td className="p-4 capitalize">{application.status}</td>
                </tr>
              )) : (
                <tr>
                  <td className="p-8 text-center text-black/45" colSpan={4}>
                    No beta applications have been submitted yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
