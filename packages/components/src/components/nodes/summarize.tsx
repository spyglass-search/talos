import { NodeBodyProps } from "../nodes";

export default function Summarize({ data }: NodeBodyProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="text-neutral-content text-sm">
        Summarize will generate both a bullet point and paragraph summary
      </div>
      <table className="table table-auto w-full table-zebra table-sm">
        <thead className="text-secondary">
          <tr>
            <th>Output Name</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>summary</td>
            <td>In-depth summary</td>
          </tr>
          <tr>
            <td>bulletSummary</td>
            <td>Key point summary</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
