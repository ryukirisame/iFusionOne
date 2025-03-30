import { VscClose } from "react-icons/vsc";
import styles from "./Tab.module.css";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import React from "react";

type TabProps = {
  title: string;
  id: string;
  onSelect: () => void;
  onClose: (event: React.MouseEvent) => void;
  isActive: boolean;
};

export default function Tab({ title, id, onSelect, onClose, isActive }: TabProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging, transition } = useSortable({
    id: id,
    animateLayoutChanges: () => false,
    transition: {
        duration: 150,
        easing: 'cubic-bezier(0.25, 1, 0.5, 1)'
    }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    background: isActive ? "#4A90E2" : "#f0f0f0",
    zIndex: isDragging ? 1000 : "auto",
    transition: transition
  };

  return (
    <div onMouseDown={onSelect} ref={setNodeRef} style={style}>
      <div
        className={`${styles["tab"]} ${isActive ? styles["active"] : ""}`}
        {...attributes}
        {...listeners}
      >
        <span className={styles["title"]}>{title}</span>
        <div
          className={styles["close-btn"]}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onClose(e);
          }}
        >
          <VscClose />
        </div>
      </div>
    </div>
  );
}
