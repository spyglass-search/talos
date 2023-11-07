export interface DropAreaProperties {
  uuid: string;
  dropAfter: boolean;
  isValidDropSpot: (dropAfter: boolean, spotUUID: string) => boolean;
  setDragNDropAfter: (dropAfter: boolean) => void;
  setDragOverUuid: (string: string | null) => void;
  nodeDropped: (after: boolean, dropUUID: string) => void;
}

export function DropArea({
  isValidDropSpot,
  dropAfter,
  uuid,
  setDragNDropAfter,
  setDragOverUuid,
  nodeDropped,
  children
}: React.PropsWithChildren<DropAreaProperties>) {
  const style = isValidDropSpot(dropAfter, uuid)
    ? "border-t-4 border-solid border-base-content"
    : "";

  return (
    <div
      className={`${style} w-full md:w-[480px] lg:w-[640px] min-h-6 mx-auto`}
      onDragOver={(event) => {
        if (isValidDropSpot(dropAfter, uuid)) {
          event.preventDefault();
        }

        setDragNDropAfter(dropAfter);
        setDragOverUuid(uuid);
      }}
      onDragLeave={(event) => {
        event.preventDefault();
        setDragOverUuid(null);
      }}
      onDrop={(dropEvent) => {
        dropEvent.preventDefault();
        nodeDropped(dropAfter, uuid);
        setDragOverUuid(null);
      }}
    >
      {children}
    </div>
  );
}
