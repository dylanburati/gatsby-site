import React from "react"
import { useStaticQuery, graphql } from "gatsby"

import "../css/styles.css"
import Layout from "../components/layout"
import SEO from "../components/seo"
import Section from "../components/section"
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd"
import { throttle } from "lodash"

class TodoRow extends React.Component {
  constructor(props) {
    super(props);
  }

  shouldComponentUpdate(nextProps, nextState) {
    return (nextProps.id !== this.props.id) ||
      (nextProps.index !== this.props.index) ||
      (nextProps.columns !== this.props.columns) ||
      (nextProps.numWidth !== this.props.numWidth) ||
      (nextProps.values !== this.props.values);
  }

  render() {
    return (
      <Draggable draggableId={this.props.id} index={this.props.index}>
        {(provided) => (
          <div className="flex items-stretch shadow-md-dark mb-2 bg-white"
            {...provided.draggableProps}
            {...provided.dragHandleProps} tabIndex="-1"
            ref={provided.innerRef}
          >
            <span className="my-2 ml-3 mr-4 flex-shrink-0" style={{width: this.props.numWidth}}>
              {this.props.index + 1}
            </span>
            {this.props.columns.map((cell, index) => 
              <input type="text"
                className="flex-grow min-w-0 p-2 border border-t-0 border-b-0 bg-black-200 hover:bg-black-300 transition-linear-200"
                key={cell.label}
                onChange={(ev) => this.props.handleChange(index, ev.target.value)}
                value={this.props.values[index + 1]}
                placeholder={cell.label}
              />)}
          </div>
        )}
      </Draggable>
    );
  } 
}

/**
 * All schemas must create empty rows as arrays, starting with the numeric string `id`,
 * and containing the field values in the other elements.
 */
const todoSchema = {
  columns: [
    { label: 'Item' },
    { label: 'Date' }
  ],
  emptyRow: function(id) {
    return [id.toString(), '', ''];
  }
}

class TodoApp extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      schema: todoSchema,
      valuesHistory: [],
      values: this.getInitialValues(),
      nextId: 0
    };
    if(this.state.values.length > 0) {
      this.state.nextId = this.getNextId();
    }
    this.handleChange = this.handleChange.bind(this);
    this.onDragEnd = this.onDragEnd.bind(this);
    this.setNextValues = this.setNextValues.bind(this);
    this.saveValues = throttle(this.saveValues, 200, { leading: false }).bind(this);
  }

  componentDidMount() {
    if(this.state.values.length === 0) {
      this.insertRows(0, 50);
    }
  }

  getInitialValues() {
    const json = localStorage.getItem('todo-v0.0');
    if(json != null) {
      return JSON.parse(json);
    }
    return [];
  }

  getNextId() {
    return this.state.values.reduce((acc, cur) => {
      return Math.max(acc, parseInt(cur[0], 10) + 1);
    }, this.state.nextId);
  }

  handleChange(rowIndex, colIndex, val) {
    const nextValues = this.state.values.slice();
    nextValues[rowIndex] = nextValues[rowIndex].slice();
    nextValues[rowIndex][colIndex + 1] = val;
    this.setNextValues(nextValues);
  }

  onDragEnd(result, provided) {
    if(result.destination != null) {
      const src = result.source.index;
      const dst = result.destination.index;
      if(src !== dst) {
        const nextValues = this.state.values.slice();
        const [moved] = nextValues.splice(src, 1);
        nextValues.splice(dst, 0, moved);
        this.setNextValues(nextValues);
      }
    }
  }

  insertRows(index, count) {
    const nextValues = this.state.values.slice();
    let endOfArray = [];
    if(index < this.state.values.length) {
      endOfArray = nextValues.splice(index);
    }
    const emptyRows = new Array(count).fill(this.state.nextId)
      .map((id, j) => this.state.schema.emptyRow(id + j));
    nextValues.push(...emptyRows);
    nextValues.push(...endOfArray);
    this.setState({
      nextId: this.state.nextId + count
    });
    this.setNextValues(nextValues);
  }

  setNextValues(nextValues) {
    this.setState((prevState) => {
      if(prevState.values.length > 0) {
        prevState.valuesHistory.push(prevState.values);
      }
      if(prevState.valuesHistory.length >= 100) {
        prevState.valuesHistory.splice(0, 50);
      }
      prevState.values = nextValues;
      return prevState;
    });
    this.saveValues();
  }

  saveValues() {
    localStorage.setItem('todo-v0.0', JSON.stringify(this.state.values));
  }

  render() {
    const maxDigits = 1 + Math.floor(Math.log10(this.state.values.length));
    return (
      <Section className="px-5 mt-6">
        <h2 className="mb-3 font-bold">Todo list</h2>
        <input className="p-2 font-mono text-sm w-full bg-gray-900 text-white mb-3"></input>
        <DragDropContext
          onDragEnd={this.onDragEnd}
        >
          <Droppable droppableId="main">
            {(provided) => (
              <div {...provided.droppableProps}
                ref={provided.innerRef}
              >
                {this.state.values.map((e, rowIndex) =>
                  <TodoRow key={e[0]} id={e[0]}
                    index={rowIndex}
                    columns={this.state.schema.columns}
                    numWidth={maxDigits * 10}
                    values={e}
                    handleChange={(colIndex, val) => this.handleChange(rowIndex, colIndex, val)} />
                )}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </Section>
    )
  }
}

const TodoPage = () => {
  return (
    <Layout
        navLinks={[
          { text: 'Blog', href: '/blog' }
        ]}>
      <SEO title="Todo" />

      <TodoApp />
    </Layout>
  );
}

export default TodoPage
