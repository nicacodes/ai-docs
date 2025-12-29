import { useEffect } from "react";
import { useStore } from "@nanostores/react";
import { FilePlus, Edit3 } from "lucide-react";
import { $hasDraft, $draftPreview, checkForDraft } from "@/store/draft-store";

interface NewPostButtonProps {
    className?: string;
}

function NewPostButton({ className }: NewPostButtonProps) {
    const hasDraft = useStore($hasDraft);
    const draftPreview = useStore($draftPreview);

    // Verificar draft al montar
    useEffect(() => {
        checkForDraft();
    }, []);

    return (
        <a
            href="/new"
            className={className}
            title={hasDraft && draftPreview ? `Continuar: ${draftPreview}` : 'Crear nuevo post'}
        >
            {hasDraft ? (
                <>
                    <Edit3 size={16} />
                    <span className="hidden sm:inline">Continuar editando</span>
                </>
            ) : (
                <>
                    <FilePlus size={16} />
                    <span className="hidden sm:inline">Nuevo Post</span>
                </>
            )}
        </a>
    );
}

export { NewPostButton };
