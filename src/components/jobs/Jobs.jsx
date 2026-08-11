import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext.jsx";
import { getJobs, createJob, applyToJob } from "../../lib/db.js";
import JobForm from "./JobForm.jsx";
import JobCard from "./JobCard.jsx";
import { button, errorText, mutedText, page } from "../../styles.js";

export default function Jobs() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const loadJobs = useCallback(() => {
    return getJobs(user.id)
      .then(setJobs)
      .catch((err) => setError(err.message));
  }, [user.id]);

  useEffect(() => {
    loadJobs().finally(() => setLoading(false));
  }, [loadJobs]);

  async function handleCreate(fields) {
    await createJob(user.id, fields);
    setShowForm(false);
    await loadJobs();
  }

  async function handleApply(job, message) {
    await applyToJob(job.id, user.id, message);
    await loadJobs();
  }

  return (
    <div style={page}>
      <button style={{ ...button, marginBottom: 16 }} onClick={() => setShowForm((v) => !v)}>
        {showForm ? "Cancelar" : "Publicar vaga"}
      </button>
      {showForm && <JobForm onCreate={handleCreate} />}
      {error && <p style={errorText}>{error}</p>}
      {loading ? (
        <p style={mutedText}>A carregar vagas…</p>
      ) : jobs.length === 0 ? (
        <p style={mutedText}>Ainda não há vagas publicadas.</p>
      ) : (
        jobs.map((job) => <JobCard key={job.id} job={job} onApply={handleApply} />)
      )}
    </div>
  );
}
