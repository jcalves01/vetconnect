import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext.jsx";
import { getSoapCaseComments, addSoapCaseComment } from "../../lib/db.js";
import CommentList from "../feed/CommentList.jsx";
import CommentComposer from "../feed/CommentComposer.jsx";
import { mutedText } from "../../styles.js";

export default function SoapCaseComments({ caseId }) {
  const { user } = useAuth();
  const [comments, setComments] = useState(null);

  useEffect(() => {
    getSoapCaseComments(caseId).then(setComments);
  }, [caseId]);

  async function handleAdd(content) {
    const comment = await addSoapCaseComment(caseId, user.id, content);
    setComments((prev) => [...(prev || []), comment]);
  }

  if (comments === null) return <p style={mutedText}>A carregar comentários…</p>;

  return (
    <div>
      <CommentList comments={comments} />
      <div style={{ marginTop: 8 }}>
        <CommentComposer onSubmit={handleAdd} />
      </div>
    </div>
  );
}
