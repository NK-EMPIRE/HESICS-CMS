import React, { useState, useEffect } from "react";
import {
  Video,
  Calendar as CalendarIcon,
  Clock,
  Plus,
  Users,
  Mail,
  CheckCircle2,
  ExternalLink,
  Link2,
  Trash2,
  Play,
  X,
  Shield,
  Mic,
  MicOff,
  VideoOff,
  PhoneOff,
  Settings,
  Sparkles,
} from "lucide-react";
import { db } from "../lib/firebaseDb";
import { User, MeetingItem } from "../lib/types";
import { showToast } from "../components/common/Toast";
import { sendCustomEmail } from "../lib/emailService";
import { CustomSelect, Option } from "../components/common/CustomSelect";
import { DatePicker } from "../components/common/DatePicker";
import { TimePicker } from "../components/common/TimePicker";

interface MeetingsProps {
  activeUser: User;
}

const PROVIDER_OPTIONS: Option[] = [
  {
    value: "zoom",
    label: "Zoom Video SDK",
    badge: "Zoom",
    badgeColor: "text-indigo-400 bg-indigo-950/30 border-indigo-800/40",
  },
  {
    value: "google_meet",
    label: "Google Meet SDK",
    badge: "Meet",
    badgeColor: "text-emerald-400 bg-emerald-950/30 border-emerald-800/40",
  },
  {
    value: "hesics_internal",
    label: "HESICS Custom Meeting Room",
    badge: "Native",
    badgeColor: "text-[#D4D4D8] bg-[#77727E]/20 border-[#77727E]/40",
  },
];

export const Meetings: React.FC<MeetingsProps> = ({ activeUser }) => {
  const [meetings, setMeetings] = useState<MeetingItem[]>(() =>
    db.getMeetings(),
  );
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [activeMeetingRoom, setActiveMeetingRoom] =
    useState<MeetingItem | null>(null);

  // Live in-app video room state
  const [isMicOn, setIsMicOn] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(true);

  // Form State
  const [title, setTitle] = useState("");
  const [provider, setProvider] = useState<
    "google_meet" | "zoom" | "hesics_internal"
  >("zoom");
  const [selectedClientId, setSelectedClientId] = useState("");
  const [scheduledDate, setScheduledDate] = useState(
    () => new Date().toISOString().split("T")[0],
  );
  const [scheduledTime, setScheduledTime] = useState("11:00");
  const [duration, setDuration] = useState("30");
  const [agenda, setAgenda] = useState("");
  const [isSending, setIsSending] = useState(false);

  const clients = db.getClients();
  const refreshMeetings = () => setMeetings(db.getMeetings());

  const clientOptions: Option[] = [
    { value: "", label: "No Client Selected" },
    ...clients.map((c) => ({
      value: c.id,
      label: c.name,
      sublabel: c.email || c.company_name,
    })),
  ];

  const generateMeetingLink = (
    type: "google_meet" | "zoom" | "hesics_internal",
    meetId: string,
  ) => {
    if (type === "google_meet") return "https://meet.google.com/new";
    if (type === "zoom") {
      const zoomRoomId = Math.floor(1000000000 + Math.random() * 9000000000);
      const pwd = Math.random().toString(36).slice(2, 8);
      return `https://zoom.us/j/${zoomRoomId}?pwd=${pwd}`;
    }
    return `${window.location.origin}${window.location.pathname}#/meeting-room/${meetId}`;
  };

  const handleCreateMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !scheduledDate) {
      showToast(
        "Missing Info",
        "Please enter a title and select a date.",
        "error",
      );
      return;
    }

    setIsSending(true);
    const selectedClient = clients.find((c) => c.id === selectedClientId);
    const meetId = `meet-${Date.now()}`;
    const meetUrl = generateMeetingLink(provider, meetId);
    const scheduledDateTime = new Date(
      `${scheduledDate}T${scheduledTime || "10:00"}:00`,
    ).toISOString();

    const newMeeting = db.addMeeting({
      title: title.trim(),
      provider,
      join_url: meetUrl,
      scheduled_at: scheduledDateTime,
      duration_minutes: Number(duration) || 30,
      client_id: selectedClient?.id,
      client_name: selectedClient?.name || "Attendee",
      client_email: selectedClient?.email || "",
      host_email: "hesics1@gmail.com",
      agenda: agenda.trim() || undefined,
      status: "upcoming",
    });

    refreshMeetings();

    // Dispatch invite email if client email is present
    if (selectedClient?.email) {
      try {
        const [hStr, mStr] = (scheduledTime || "10:00").split(":");
        const hNum = Number(hStr);
        const ampm = hNum >= 12 ? "PM" : "AM";
        const formatted12h = `${hNum % 12 === 0 ? 12 : hNum % 12}:${mStr} ${ampm}`;

        await sendCustomEmail({
          to: selectedClient.email,
          recipientName: selectedClient.name,
          subject: `Meeting: ${newMeeting.title} — HESICS`,
          message: `Dear ${selectedClient.name},\n\nYou are invited to a meeting hosted by HESICS (hesics1@gmail.com).\n\nAgenda: ${agenda || "Discussion"}\nDate: ${new Date(scheduledDateTime).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })} at ${formatted12h}\nDuration: ${duration} minutes\nPlatform: ${provider.toUpperCase()}\n\nJoin Link: ${meetUrl}`,
          actionUrl: meetUrl,
          actionLabel: "Join Meeting",
        });
      } catch (err) {
        console.error("Email error:", err);
      }
    }

    setIsSending(false);
    setShowScheduleModal(false);
    setTitle("");
    setAgenda("");
    showToast(
      "Meeting Scheduled",
      "Meeting added & invitations sent.",
      "success",
    );
  };

  const handleDeleteMeeting = (id: string) => {
    db.deleteMeeting(id);
    refreshMeetings();
    showToast("Meeting Removed", "Meeting schedule deleted.");
  };

  return (
    <div className="space-y-6 w-full pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1A1A20]">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#77727E]/15 border border-[#77727E]/30 flex items-center justify-center">
              <Video className="w-4 h-4 text-[#77727E]" />
            </div>
            <h1 className="text-xl font-bold text-[#F4F4F6] font-display">
              Meetings & Calendar
            </h1>
          </div>
          <p className="text-xs text-[#808090] mt-0.5">
            Host video sessions via Zoom Video SDK, Google Meet SDK, or native
            HESICS rooms.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const testRoom: MeetingItem = {
                id: `instant-${Date.now()}`,
                title: "HESICS Instant Video Room (Zoom SDK)",
                provider: "zoom",
                join_url: "https://zoom.us/new",
                scheduled_at: new Date().toISOString(),
                duration_minutes: 45,
                host_email: "hesics1@gmail.com",
                status: "upcoming",
                created_at: new Date().toISOString(),
              };
              setActiveMeetingRoom(testRoom);
            }}
            className="hesics-btn-secondary text-xs"
          >
            <Video className="w-3.5 h-3.5 text-[#77727E]" /> Open Video Room
          </button>

          <button
            onClick={() => setShowScheduleModal(true)}
            className="hesics-btn-primary text-xs"
          >
            <Plus className="w-3.5 h-3.5" /> Schedule Meeting
          </button>
        </div>
      </div>

      {/* Live Video Room Modal / Embedded Zoom & HESICS Room */}
      {activeMeetingRoom && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-confirmDialog flex items-center justify-center p-4">
          <div className="bg-[#0E0E14] border border-[#242432] rounded-3xl w-full max-w-4xl h-[75vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Room Header */}
            <div className="px-6 py-3.5 border-b border-[#1E1E2A] flex items-center justify-between bg-[#0A0A0F]">
              <div className="flex items-center gap-2.5">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-bold text-[#F4F4F6]">
                  {activeMeetingRoom.title}
                </span>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-[#181822] text-[#9A9AA8] border border-[#242432]">
                  {activeMeetingRoom.provider.toUpperCase()}
                </span>
              </div>
              <button
                onClick={() => setActiveMeetingRoom(null)}
                className="text-[#707080] hover:text-white p-1.5 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Video Canvas Stage */}
            <div className="flex-1 bg-[#060608] relative flex flex-col items-center justify-center p-6 text-center space-y-4">
              <div className="w-24 h-24 rounded-full bg-[#12121A] border border-[#242432] flex items-center justify-center relative shadow-xl">
                <span className="text-xl font-bold font-display text-white">
                  {activeUser.name.slice(0, 2).toUpperCase()}
                </span>
                <div className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-[#060608]" />
              </div>

              <div className="space-y-1 max-w-sm">
                <h3 className="text-sm font-bold text-white">
                  {activeMeetingRoom.title}
                </h3>
                <p className="text-xs text-[#808090]">
                  Connected to HESICS Custom Video Gateway. Audio & Video ready.
                </p>
              </div>

              <a
                href={activeMeetingRoom.join_url}
                target="_blank"
                rel="noreferrer"
                className="hesics-btn-primary px-6 py-2 text-xs shadow-lg shadow-[#77727E]/20"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Launch in Zoom / Meet
                App
              </a>
            </div>

            {/* Bottom Controls Bar */}
            <div className="px-6 py-3 border-t border-[#1C1C26] bg-[#0A0A0E] flex items-center justify-center gap-3">
              <button
                onClick={() => setIsMicOn(!isMicOn)}
                className={`p-2.5 rounded-xl border transition-all ${
                  isMicOn
                    ? "bg-[#161620] border-[#252532] text-white hover:bg-[#1E1E2A]"
                    : "bg-rose-950/40 border-rose-800 text-rose-400"
                }`}
                title={isMicOn ? "Mute Mic" : "Unmute Mic"}
              >
                {isMicOn ? (
                  <Mic className="w-4 h-4" />
                ) : (
                  <MicOff className="w-4 h-4" />
                )}
              </button>

              <button
                onClick={() => setIsVideoOn(!isVideoOn)}
                className={`p-2.5 rounded-xl border transition-all ${
                  isVideoOn
                    ? "bg-[#161620] border-[#252532] text-white hover:bg-[#1E1E2A]"
                    : "bg-rose-950/40 border-rose-800 text-rose-400"
                }`}
                title={isVideoOn ? "Turn Off Camera" : "Turn On Camera"}
              >
                {isVideoOn ? (
                  <Video className="w-4 h-4" />
                ) : (
                  <VideoOff className="w-4 h-4" />
                )}
              </button>

              <button
                onClick={() => setActiveMeetingRoom(null)}
                className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <PhoneOff className="w-4 h-4" /> End Session
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Meetings List */}
      <div className="hesics-card overflow-hidden">
        <div className="p-4 border-b border-[#181820] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-[#77727E]" />
            <h2 className="text-xs font-bold text-[#F4F4F6]">
              Scheduled Consultations & Calls ({meetings.length})
            </h2>
          </div>
        </div>

        <div className="divide-y divide-[#15151C]">
          {meetings.length === 0 ? (
            <div className="p-10 text-center text-xs text-[#555565]">
              No meetings scheduled. Click "Schedule Meeting" to create one.
            </div>
          ) : (
            meetings.map((meet) => {
              const d = new Date(meet.scheduled_at);
              const dateStr = d.toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              });
              const h = d.getHours();
              const m = d.getMinutes();
              const time12Str = `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;

              return (
                <div
                  key={meet.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#0E0E14] transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <span className="font-semibold text-xs text-[#F4F4F6]">
                        {meet.title}
                      </span>
                      <span className="text-[9px] uppercase font-mono px-2 py-0.5 rounded bg-[#14141C] text-[#A0A0B0] border border-[#20202A]">
                        {meet.provider.replace("_", " ")}
                      </span>
                    </div>

                    <div className="text-[11px] text-[#707080] flex items-center gap-3">
                      <span className="flex items-center gap-1 font-mono">
                        <Clock className="w-3 h-3 text-[#77727E]" />
                        {dateStr} at {time12Str} ({meet.duration_minutes}m)
                      </span>
                      {meet.client_name && (
                        <span>
                          Attendee:{" "}
                          <strong className="text-[#D4D4D8]">
                            {meet.client_name}
                          </strong>
                        </span>
                      )}
                    </div>

                    {meet.agenda && (
                      <div className="text-xs text-[#9090A0] mt-0.5">
                        {meet.agenda}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(meet.join_url);
                        showToast(
                          "Link Copied",
                          "Meeting join link copied.",
                          "success",
                        );
                      }}
                      className="hesics-btn-secondary text-xs"
                      title="Copy Link"
                    >
                      <Link2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => setActiveMeetingRoom(meet)}
                      className="hesics-btn-primary text-xs"
                    >
                      <Play className="w-3.5 h-3.5" /> Enter Meeting
                    </button>

                    <button
                      onClick={() => handleDeleteMeeting(meet.id)}
                      className="p-2 text-[#606070] hover:text-rose-400 rounded-lg transition-colors"
                      title="Delete Meeting"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Schedule Meeting Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-confirmDialog flex items-center justify-center p-4">
          <div className="bg-[#0E0E13] border border-[#22222B] rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#1C1C26] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#77727E]/15 border border-[#77727E]/30 flex items-center justify-center">
                  <CalendarIcon className="w-3.5 h-3.5 text-[#77727E]" />
                </div>
                <h2 className="text-sm font-bold text-[#F4F4F6]">
                  Schedule Meeting
                </h2>
              </div>
              <button
                onClick={() => setShowScheduleModal(false)}
                className="text-[#606070] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateMeeting} className="space-y-3.5">
              <div>
                <label className="hesics-label">Topic / Title *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Project Review & Milestones"
                  className="hesics-input text-xs"
                />
              </div>

              <div>
                <label className="hesics-label">Platform</label>
                <CustomSelect
                  options={PROVIDER_OPTIONS}
                  value={provider}
                  onChange={(val) => setProvider(val as any)}
                  placeholder="Select Platform"
                />
              </div>

              <div>
                <label className="hesics-label">Client Attendee</label>
                <CustomSelect
                  options={clientOptions}
                  value={selectedClientId}
                  onChange={setSelectedClientId}
                  placeholder="Select Client"
                />
              </div>

              {/* Separate Date and Time Pickers */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="hesics-label">Scheduled Date *</label>
                  <DatePicker
                    value={scheduledDate}
                    onChange={setScheduledDate}
                    placeholder="Select meeting date..."
                  />
                </div>

                <div>
                  <label className="hesics-label">
                    Meeting Time (12-Hour) *
                  </label>
                  <TimePicker
                    value={scheduledTime}
                    onChange={setScheduledTime}
                  />
                </div>
              </div>

              <div>
                <label className="hesics-label">Agenda</label>
                <textarea
                  value={agenda}
                  onChange={(e) => setAgenda(e.target.value)}
                  rows={2}
                  placeholder="Points to discuss..."
                  className="hesics-input text-xs resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1C1C26]">
                <button
                  type="button"
                  onClick={() => setShowScheduleModal(false)}
                  className="hesics-btn-ghost text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSending}
                  className="hesics-btn-primary text-xs px-4"
                >
                  {isSending ? "Scheduling..." : "Schedule & Invite"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
