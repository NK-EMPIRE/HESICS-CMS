import React, { useState, useEffect } from "react";
import { Trash2, UserX, ShieldAlert, X } from "lucide-react";
import { User } from "../../lib/types";

export type UserConfirmActionType = "delete" | "deactivate";

interface UserConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  targetUser: User | null;
  actionType: UserConfirmActionType;
}

export const UserConfirmModal: React.FC<UserConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  targetUser,
  actionType,
}) => {
  const [typedInput, setTypedInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTypedInput("");
      setIsSubmitting(false);
    }
  }, [isOpen]);

  if (!isOpen || !targetUser) return null;

  const isDelete = actionType === "delete";
  const requiredPhrase = isDelete
    ? `delete ${targetUser.email.toLowerCase()}`
    : `deactivate ${targetUser.email.toLowerCase()}`;

  const isMatch =
    typedInput.trim().toLowerCase() === requiredPhrase.toLowerCase();

  const handleExecute = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isMatch) return;

    setIsSubmitting(true);
    onConfirm();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-confirmDialog flex items-center justify-center p-4">
      <div className="bg-[#0D0D11] border border-rose-900/40 rounded-3xl w-full max-w-lg shadow-2xl shadow-rose-950/20 overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-[#1C1C26] flex items-start justify-between bg-[#120B0F]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-950/60 border border-rose-800/60 flex items-center justify-center shrink-0">
              {isDelete ? (
                <Trash2 className="w-5 h-5 text-rose-400" />
              ) : (
                <UserX className="w-5 h-5 text-amber-400" />
              )}
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#F4F4F6] font-display">
                {isDelete
                  ? "Permanently Remove Team Member"
                  : "Deactivate Member Credentials"}
              </h2>
              <p className="text-xs text-[#808090] mt-0.5">
                Target account:{" "}
                <span className="font-semibold text-[#D4D4D8]">
                  {targetUser.name}
                </span>{" "}
                ({targetUser.email})
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-[#707080] hover:text-white p-1.5 rounded-xl hover:bg-[#1C1C26] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleExecute} className="p-6 space-y-5">
          {/* Warning Banner */}
          <div className="p-3.5 rounded-2xl bg-rose-950/25 border border-rose-800/40 flex items-start gap-3">
            <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="text-xs text-rose-200/90 leading-relaxed">
              {isDelete ? (
                <>
                  This action is <strong>irreversible</strong>. The user's
                  credentials, active sessions, and access permissions will be
                  permanently purged across HESICS OS and Cloud Firestore.
                </>
              ) : (
                <>
                  Deactivating will immediately{" "}
                  <strong>revoke all session tokens</strong> and block portal
                  login until explicitly reactivated by an Executive Admin.
                </>
              )}
            </div>
          </div>

          {/* GitHub-style Confirmation Prompt */}
          <div className="space-y-2">
            <label className="text-xs text-[#A0A0B0] block">
              To verify this operation, please type{" "}
              <span className="font-mono font-bold text-rose-400 bg-rose-950/40 px-1.5 py-0.5 rounded border border-rose-900/60 select-all">
                {requiredPhrase}
              </span>{" "}
              below:
            </label>
            <input
              type="text"
              autoFocus
              value={typedInput}
              onChange={(e) => setTypedInput(e.target.value)}
              placeholder={requiredPhrase}
              className="hesics-input text-xs font-mono w-full border-rose-900/30 focus:border-rose-500"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-2 border-t border-[#1C1C26]">
            <button
              type="button"
              onClick={onClose}
              className="hesics-btn-ghost text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isMatch || isSubmitting}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                isMatch && !isSubmitting
                  ? isDelete
                    ? "bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/30 cursor-pointer"
                    : "bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-600/30 cursor-pointer"
                  : "bg-[#1E1E28] text-[#555565] border border-[#262632] cursor-not-allowed opacity-60"
              }`}
            >
              {isDelete ? (
                <>
                  <Trash2 className="w-3.5 h-3.5" />I understand the
                  consequences, delete this member
                </>
              ) : (
                <>
                  <UserX className="w-3.5 h-3.5" />
                  Confirm and deactivate member
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
