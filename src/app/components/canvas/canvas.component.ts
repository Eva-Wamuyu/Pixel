import { Component, ElementRef, HostListener, OnInit, ViewChild } from '@angular/core';

@Component({
  selector: 'app-canvas',
  templateUrl: './canvas.component.html',
  styleUrls: ['./canvas.component.css']
})
export class CanvasComponent implements OnInit {

  @ViewChild('canvas', { static: true }) canvas!: ElementRef<HTMLCanvasElement>;
  private ctx!: CanvasRenderingContext2D;
  private drawing: boolean = false;
  private selectedShape: string = 'freehand';
  private startX: number = 0;
  private startY: number = 0;

  private undoStack: string[] = [];
  private redoStack: string[] = [];

  private backgroundColor: string = '#ffffff';

  ngOnInit() {
    this.initializeCanvas();
  }

  private initializeCanvas(){
    const canvas = this.canvas.nativeElement;
    const context = canvas.getContext('2d');
    if (context) {
      this.ctx = context;
    } else {
      throw new Error('Unable to get 2D context');
    }
    this.clearCanvas();
  }

  private getCanvasCoordinates(event: MouseEvent | TouchEvent): { x: number, y: number } {
    const rect = this.canvas.nativeElement.getBoundingClientRect();
    let x, y;
    if (event instanceof MouseEvent) {
      x = event.clientX - rect.left;
      y = event.clientY - rect.top;
    } else {
      const touch = event.touches[0];
      x = touch.clientX - rect.left;
      y = touch.clientY - rect.top;
    }
    return { x, y };
  }

  @HostListener('mousedown', ['$event'])
  onMouseDown(event: MouseEvent) {
    const { x, y } = this.getCanvasCoordinates(event);
    this.startX = x;
    this.startY = y;
    this.drawing = true;
    if (this.selectedShape === 'freehand') {
      this.ctx.beginPath();
      this.ctx.moveTo(x, y);
    }
  }

  @HostListener('mousemove', ['$event'])
  onMouseMove(event: MouseEvent) {
    if (this.drawing) {
      const { x, y } = this.getCanvasCoordinates(event);
      if (this.selectedShape === 'freehand') {
        this.ctx.lineTo(x, y);
        this.ctx.stroke();
      } else {
        this.redraw();
        this.drawShape(this.startX, this.startY, x, y);
      }
    }
  }

  @HostListener('mouseup')
  @HostListener('mouseleave')
  onMouseUp() {
    if (this.drawing) {
      const { x, y } = this.getCanvasCoordinates(event as MouseEvent);
      if (this.selectedShape !== 'freehand') {
        this.drawShape(this.startX, this.startY, x, y);
      }
      this.stopDrawing();
      this.saveState();
    }
  }

  @HostListener('touchstart', ['$event'])
  onTouchStart(event: TouchEvent) {
    event.preventDefault();
    const { x, y } = this.getCanvasCoordinates(event);
    this.startX = x;
    this.startY = y;
    this.drawing = true;
    if (this.selectedShape === 'freehand') {
      this.ctx.beginPath();
      this.ctx.moveTo(x, y);
    }
  }

  @HostListener('touchmove', ['$event'])
  onTouchMove(event: TouchEvent) {
    event.preventDefault();
    if (this.drawing) {
      const { x, y } = this.getCanvasCoordinates(event);
      if (this.selectedShape === 'freehand') {
        this.ctx.lineTo(x, y);
        this.ctx.stroke();
      } else {
        this.redraw();
        this.drawShape(this.startX, this.startY, x, y);
      }
    }
  }

  @HostListener('touchend')
  @HostListener('touchcancel')
  onTouchEnd() {
    if (this.drawing) {
      const { x, y } = this.getCanvasCoordinates(event as TouchEvent);
      if (this.selectedShape !== 'freehand') {
        this.drawShape(this.startX, this.startY, x, y);
      }
      this.stopDrawing();
      this.saveState();
    }
  }

  private drawShape(startX: number, startY: number, endX: number, endY: number) {
    this.ctx.beginPath();
    switch (this.selectedShape) {
      case 'line':
        this.ctx.moveTo(startX, startY);
        this.ctx.lineTo(endX, endY);
        break;
      case 'rectangle':
        const width = endX - startX;
        const height = endY - startY;
        this.ctx.rect(startX, startY, width, height);
        break;
      case 'circle':
        const radius = Math.sqrt(Math.pow((endX - startX), 2) + Math.pow((endY - startY), 2));
        this.ctx.arc(startX, startY, radius, 0, 2 * Math.PI);
        break;
    }
    this.ctx.stroke();
  }

  private stopDrawing() {
    this.drawing = false;
    if (this.selectedShape === 'freehand') {
      this.ctx.closePath();
    }
  }

  private redraw() {
    const canvas = this.canvas.nativeElement;
    this.ctx.clearRect(0, 0, canvas.width, canvas.height);
    const img = new Image();
    const [lastState] = this.undoStack.slice(-1);
    if (lastState) {
      img.src = lastState;
      img.onload = () => {
        this.ctx.drawImage(img, 0, 0);
      };
    }
  }

  onShapeSelected(shape: string) {
    this.selectedShape = shape;
  }

  changeColor(color: string) {
    this.ctx.strokeStyle = color;
  }

  onBackgroundColorSelected(color: string) {
    this.backgroundColor = color;
    this.clearCanvas();
  }

  clearCanvas() {
    const canvas = this.canvas.nativeElement;
    this.ctx.fillStyle = this.backgroundColor;
    this.ctx.fillRect(0, 0, canvas.width, canvas.height);
    this.saveState();
  }

  private saveState() {
    const canvas = this.canvas.nativeElement;
    this.undoStack.push(canvas.toDataURL());
    console.log('State saved:', this.undoStack);
    if (this.undoStack.length > 10) {
      this.undoStack.shift();
    }
    this.redoStack = [];
  }

  undoCanvas() {
    if (this.undoStack.length > 1) {
      this.redoStack.push(this.undoStack.pop()!);
      console.log('Undo:', this.undoStack);
      console.log('Redo:', this.redoStack);
      this.restoreCanvas(this.undoStack[this.undoStack.length - 1]);
    }
  }

  redoCanvas(){
    if (this.redoStack.length > 0) {
      const img = this.redoStack.pop()!;
      this.undoStack.push(img);
      console.log('Redo:', this.undoStack);
      console.log('Undo:', this.redoStack);
      this.restoreCanvas(img);
    }
  }

  private restoreCanvas(dataUrl: string) {
    const canvas = this.canvas.nativeElement;
    const img = new Image();
    img.src = dataUrl;
    img.onload = () => {
      this.ctx.clearRect(0, 0, canvas.width, canvas.height);
      this.ctx.drawImage(img, 0, 0);
    };
  }

  downloadCanvas() {
    const BACKGROUND_COLOR: string = '#FFFFFF';

    const canvas = this.canvas.nativeElement;
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d')!;

    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    tempCtx.fillStyle = BACKGROUND_COLOR;
    tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
    tempCtx.drawImage(canvas, 0, 0);

    const link = document.createElement('a');
    link.href = tempCanvas.toDataURL('image/png');
    link.download = 'sketchy.png';
    link.click();
  }

  @HostListener('document:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    if (event.ctrlKey && !event.shiftKey && event.key.toLowerCase() === 'z') {
      this.undoCanvas();
      event.preventDefault();
    } else if ((event.ctrlKey && event.key.toLowerCase() === 'y') || (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'z')) {
      this.redoCanvas();
      event.preventDefault();
    } else if (event.key === 'Delete' || event.key === 'Backspace') {
      this.clearCanvas();
      event.preventDefault();
    }
  }
}
