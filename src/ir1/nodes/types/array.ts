import * as AST from "../../../ast";
import * as ASTTypes from "../../../ast/types";
import { nodeFromExpression } from "../../create";
import { SingleValuePort } from "../../ports/single";
import { Scope } from "../../scopes/scope";
import * as Types from "../../types";
import { checkType } from "../../types/check";
import * as Values from "../../values";
import { Node } from "../node";

export class ArrayType extends Node {
  private nodes: Node[];

  constructor(defintion: ASTTypes.ArrayType, scope: Scope) {
    super("ArrayType", defintion);

    this.nodes = [];
    this.nodes.push(nodeFromExpression(defintion.elementType, scope));

    this.addInPorts(this.nodes);

    this.outPorts = [new SingleValuePort(this.fetchData)];
  }

  public fetchData(type: Types.ReadyType): Values.ReadyValue {
    if (!checkType(new Types.Type(), type)) {
      return new Values.ErrorValue("Incompartible type, not type");
    }

    const result = this.inPorts[0].getData(new Types.Type()) as Values.Type;
    return new Values.Type(new Types.Array(result.value));
  }
}
