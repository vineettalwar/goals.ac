import { useEffect, useRef } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  ContentPieceNotFound,
  ContentPieceView,
  contentPieceCanGenerate,
  contentPieceCanPublish,
} from "@workspace/app-shell";
import { useAuth } from "@/context/auth";
import { useContentPieceData } from "@/hooks/use-content-piece-data";

export function ContentPiecePage() {
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const autoGenerateRequested = useRef(false);
  const {
    loading,
    error,
    notFound,
    piece,
    generating,
    generatingState,
    generateMessage,
    generate,
    publishing,
    publishMessage,
    publish,
  } = useContentPieceData(id);

  useEffect(() => {
    if (!authLoading && !user) navigate("/login", { replace: true });
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (autoGenerateRequested.current) return;
    if (searchParams.get("generate") !== "1" || !piece) return;
    if (!contentPieceCanGenerate(piece.status)) {
      setSearchParams({}, { replace: true });
      return;
    }
    autoGenerateRequested.current = true;
    setSearchParams({}, { replace: true });
    void generate();
  }, [searchParams, piece, generate, setSearchParams]);

  if (authLoading || loading) {
    return <p className="p-8 text-muted-foreground">Loading content…</p>;
  }

  if (notFound) {
    return (
      <ContentPieceNotFound
        renderLink={({ href, className, children }) => (
          <Link to={href} className={className}>
            {children}
          </Link>
        )}
      />
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl px-8 py-8">
        <p className="mb-4 text-sm text-red-700">{error}</p>
        <Link to="/studio" className="text-sm font-medium text-primary hover:underline">
          ← Content studio
        </Link>
      </div>
    );
  }

  if (!piece) {
    return <p className="p-8 text-muted-foreground">Loading content…</p>;
  }

  return (
    <ContentPieceView
      piece={piece}
      generating={generating}
      generatingState={generatingState}
      generateMessage={generateMessage}
      onGenerate={contentPieceCanGenerate(piece.status) ? generate : undefined}
      publishing={publishing}
      publishMessage={publishMessage}
      onPublish={contentPieceCanPublish(piece.status) ? publish : undefined}
      renderLink={({ href, className, children }) => (
        <Link to={href} className={className}>
          {children}
        </Link>
      )}
    />
  );
}
