import { MutableRefObject } from "react";

export { default as AddNodeModal } from "./AddNodeModal";

export interface ModalProps {
  children: React.ReactNode;
  modalRef: MutableRefObject<null>;
}

function Modal({ children, modalRef }: ModalProps) {
  return (
    <dialog ref={modalRef} className="modal">
      <form method="dialog" className="modal-box border-2 border-primary">
        {children}
        <div className="modal-action">
          <button className="btn btn-sm btn-error">Cancel</button>
        </div>
      </form>
    </dialog>
  );
}

export default Modal;
