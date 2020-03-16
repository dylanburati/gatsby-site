import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { ArrowLeft, FilePlus, Trash2 } from 'react-feather';
import { useContextGateway } from './gatewayProvider';

export function Table({ rows, columns, handleSelect, handleOpen }) {
  if (rows.length === 0) {
    return <p className="mt-2">Click create to start a sheet</p>;
  }

  return (
    <table className="w-full mt-2">
      <thead>
        <tr>
          <th style={{ width: 1 }}></th>
          {columns.map(col => (
            <th key={col.field} className={'px-2 py-1 ' + col.class || ''}>
              {col.label ?? col.field}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map(item => (
          <tr
            key={item.name}
            className="hover:bg-paper-darker cursor-pointer"
            onClick={ev => handleOpen(item)}
          >
            <td className="px-2 pt-1">
              <input
                type="checkbox"
                onClick={ev => ev.stopPropagation()}
                onChange={ev => handleSelect(item, ev.target.checked)}
              ></input>
            </td>
            {columns.map(col => (
              <td key={col.field} className={'px-2 py-1 ' + col.class || ''}>
                {col.render
                  ? col.render(item[col.field], item)
                  : item[col.field]}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Dashboard({
  bins,
  handleOpen,
  handleCreate,
  handleDelete,
  handleBack,
}) {
  const { user } = useContextGateway();
  const [selected, setSelected] = useState([]);
  const withoutDeleted = selected.filter(e => bins.includes(e));
  if (withoutDeleted.length < selected.length) {
    setSelected(withoutDeleted);
  }
  const handleSelect = (item, isSelected) => {
    setSelected([...selected, item].filter(e => isSelected || e !== item));
  };

  return (
    <div>
      <div className="flex items-center border-b pb-2">
        <button
          className="hover:bg-paper-darker text-accent p-1 rounded-full"
          onClick={handleBack}
        >
          <ArrowLeft className="stroke-current" />
        </button>
        <span className="flex-grow"></span>
        {selected.length > 0 && (
          <button
            className="hover:bg-paper-darker text-accent py-1 px-2 mb-1 rounded"
            onClick={() => handleDelete(selected)}
          >
            <Trash2 className="stroke-current inline" />
            <span className="font-bold text-sm uppercase mx-1">Delete</span>
          </button>
        )}
        <button
          className="hover:bg-paper-darker text-accent py-1 px-2 mb-1 rounded"
          onClick={handleCreate}
        >
          <FilePlus className="stroke-current inline" />
          <span className="font-bold text-sm uppercase mx-1">Create</span>
        </button>
      </div>
      <Table
        rows={bins}
        columns={[
          {
            field: 'name',
            label: 'Name',
            class: 'text-left',
            render: (name, { username }) =>
              user.username === username ? name : `@${username}/${name}`,
          },
          {
            field: 'updatedAt',
            label: 'Date modified',
            class: 'text-right',
            render: ts => new Date(ts).toLocaleString(),
          },
        ]}
        handleSelect={handleSelect}
        handleOpen={handleOpen}
      />
    </div>
  );
}

Dashboard.propTypes = {
  bins: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string,
      updatedAt: PropTypes.string,
    })
  ).isRequired,
  handleOpen: PropTypes.func.isRequired,
  handleCreate: PropTypes.func.isRequired,
  handleBack: PropTypes.func.isRequired,
};

export default Dashboard;