"use client";
import dynamic from "next/dynamic";
import SearchModal from '@/components/SearchModal';
import SettingsModal from '@/components/SettingsModal';
import AIChatView from '@/components/AIChatView';
import { useAppStore } from '@/store/useAppStore';

const Editor = dynamic(() => import("@/components/Editor"), {
  ssr: false,
});

export default function WorkspacePage() {
  const { activeConversationId } = useAppStore();

  return (
    <>
      {activeConversationId ? <AIChatView /> : <Editor />}
      <SearchModal />
      <SettingsModal />
    </>
  );
}
