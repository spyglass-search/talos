export interface DropAreaProperties {
  uuid: string;
  dropAfter: boolean;
  isValidDropSpot: (dropAfter: boolean, spotUUID: string) => boolean;
  setDragNDropAfter: (dropAfter: boolean) => void;
  setDragOverUuid: (string: string | null) => void;
  nodeDropped: (after: boolean, dropUUID: string) => void;
}

export function DropArea(props: React.PropsWithChildren<DropAreaProperties>) {
  const style = props.isValidDropSpot(props.dropAfter, props.uuid)
    ? "border-t-4 border-solid border-base-content"
    : "";

  return (
    <div
      className={`${style} w-full md:w-[480px] lg:w-[640px] min-h-6 mx-auto`}
      onDragOver={(event) => {
        if (props.isValidDropSpot(props.dropAfter, props.uuid)) {
          event.preventDefault();
        }

        props.setDragNDropAfter(props.dropAfter);
        props.setDragOverUuid(props.uuid);
      }}
      onDragLeave={(event) => {
        event.preventDefault();
        props.setDragOverUuid(null);
      }}
      onDrop={(dropEvent) => {
        dropEvent.preventDefault();
        props.nodeDropped(props.dropAfter, props.uuid);
        props.setDragOverUuid(null);
      }}
    >
      {props.children}
    </div>
  );
}
