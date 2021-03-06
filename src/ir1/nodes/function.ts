import * as AST from "../../ast";
import { nodeFromExpression } from "../create";
import { SingleValuePort } from "../ports/single";
import { FlatScope } from "../scopes/flat";
import { Scope } from "../scopes/scope";
import * as Types from "../types";
import * as Values from "../values";
import { Node } from "./node";
import { SomeType } from "./types/some";

export class FunctionValue extends Node {
  private params: Map<string, Node>;
  private returns: Node[];
  private bodyFactory: Values.BodyFactory;
  private scope: Scope;

  constructor(definition: AST.FunctionValue, s: Scope) {
    super("Lambda", definition);
    this.scope = new FlatScope(s);

    this.bodyFactory = (scope: Scope) => {
      const nodes: Node[] = [];
      for (const expression of definition.body) {
        nodes.push(nodeFromExpression(expression, scope));
      }
      return nodes;
    };

    this.params = new Map();
    for (const field of definition.params) {
      const type: Node = field.dataType ? nodeFromExpression(field.dataType, s)
                                      : new SomeType();
      if (type.outPorts.length !== 1) {
        throw new Error("Each type of the signature should produce exactly one output");
      }

      this.params.set(field.name, type);
    }

    this.returns = [];
    for (const expression of definition.returns) {
      const node = nodeFromExpression(expression, this.scope);
      if (node.outPorts.length !== 1) {
        throw new Error("Each type of the signature should produce exactly one output");
      }
      this.returns.push(node);
    }
    while (this.returns.length < definition.body.length) {
      this.returns.push(new SomeType());
    }
    this.outPorts.push(new SingleValuePort((type: Types.ReadyType) => this.fetchData(type)));
  }

  public fetchData(type: Types.ReadyType): Values.ReadyValue {
    const params: Types.ReadyType[] = [];
    const names: string[] = [];

    this.params.forEach((value: Node, key: string) => {
      names.push(key);
      params.push((value.outPorts[0].getData(new Types.Type()) as Values.Type).value);
    });

    const returns: Types.ReadyType[] = [];
    for (const node of this.returns) {
      returns.push(
        (node.outPorts[0].getData(new Types.Type()) as Values.Type).value);
    }
    const readyType = new Types.Function(params, returns);

    if (!Types.checkType(readyType, type)) {
      return new Values.ErrorValue("Incompartible type, not type");
    }

    return new Values.Function(readyType, names, this.bodyFactory, this.scope);
  }
}
