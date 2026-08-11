import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext.jsx";
import { getMySoapCases, getSharedSoapCases, createSoapCase } from "../../lib/db.js";
import SoapCaseForm from "./SoapCaseForm.jsx";
import SoapCaseCard from "./SoapCaseCard.jsx";
import { button, colors, errorText, mutedText, page } from "../../styles.js";

export default function SoapCases() {
  const { user } = useAuth();
  const [myCases, setMyCases] = useState([]);
  const [sharedCases, setSharedCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const loadCases = useCallback(() => {
    return Promise.all([getMySoapCases(user.id), getSharedSoapCases(user.id)]).then(
      ([mine, shared]) => {
        setMyCases(mine);
        setSharedCases(shared);
      }
    );
  }, [user.id]);

  useEffect(() => {
    loadCases()
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [loadCases]);

  async function handleCreate(fields) {
    await createSoapCase(user.id, fields);
    setShowForm(false);
    await loadCases();
  }

  return (
    <div style={page}>
      <button style={{ ...button, marginBottom: 16 }} onClick={() => setShowForm((v) => !v)}>
        {showForm ? "Cancelar" : "Novo caso SOAP"}
      </button>
      {showForm && <SoapCaseForm onCreate={handleCreate} />}
      {error && <p style={errorText}>{error}</p>}

      {loading ? (
        <p style={mutedText}>A carregar casos…</p>
      ) : (
        <>
          <h3 style={{ color: colors.text }}>Os meus casos</h3>
          {myCases.length === 0 ? (
            <p style={mutedText}>Ainda não criaste nenhum caso.</p>
          ) : (
            myCases.map((c) => <SoapCaseCard key={c.id} soapCase={c} />)
          )}

          <h3 style={{ color: colors.text }}>Partilhados pela rede</h3>
          {sharedCases.length === 0 ? (
            <p style={mutedText}>Ainda não há casos partilhados por outros colegas.</p>
          ) : (
            sharedCases.map((c) => <SoapCaseCard key={c.id} soapCase={c} />)
          )}
        </>
      )}
    </div>
  );
}
