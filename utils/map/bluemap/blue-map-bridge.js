/*
 * BlueMap v5.3 MIT-licensed runtime compatibility patch.
 * This is the side effect from BlueMap.js that the Portal renderer needs;
 * the standalone BlueMap Vue application is intentionally not imported.
 */
import { Object3D } from 'three'

Object3D.prototype.onClick = function (event) {
	if (this.parent) {
		if (!Array.isArray(event.eventStack)) event.eventStack = []
		event.eventStack.push(this)
		return this.parent.onClick(event)
	}

	return false
}
