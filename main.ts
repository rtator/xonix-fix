let bg = scene.backgroundImage()

const width = scene.screenWidth()
const height = scene.screenHeight()

const tile_size_c = 4
const map_height = Math.floor(height / tile_size_c)
const map_width = Math.floor(width / tile_size_c)
const map_height_m3 = map_height - 3
const map_width_m3 = map_width - 3

const EMPTY_COLOR = 0
const PATH_COLOR = 2
const ROAD_COLOR = 6
const MAP_CELL_EMPTY = 0
const MAP_CELL_ROAD = 1
const MAP_CELL_PATH = 2
const MAP_CELL_MARK = 4

let playerImages = [
    img`
        . 5 5 .
        5 6 6 5
        5 5 6 5
        . 5 5 .
    `,
    img`
        . 5 5 .
        5 5 6 5
        5 6 6 5
        . 5 5 .
    `,
    img`
        . 5 5 .
        5 6 5 5
        5 6 6 5
        . 5 5 .
    `,
    img`
        . 5 5 .
        5 6 6 5
        5 6 5 5
        . 5 5 .
    `]

let enemy1Images = [
    img`
        . d . .
        . d d .
        . d d .
        . . d .
    `,
    img`
        . . d .
        . d d .
        . d d .
        . d . .
    `,
    img`
        . . . .
        . d d d
        d d d .
        . . . .
    `,
    img`
        . . . .
        d d d .
        . d d d
        . . . .    `]

let enemy2Images = [
    img`
        8 . 8 8
        8 2 2 .
        . 2 2 8
        8 8 . 8
    `,
    img`
        . 8 8 .
        8 2 2 8
        8 2 2 8
        . 8 8 .
    `,
    img`
        8 8 . 8
        . 2 2 8
        8 2 2 .
        8 . 8 8
    `,
    img`
        . 8 8 .
        8 2 2 8
        8 2 2 8
        . 8 8 .
    `]

let player_anim = animation.createAnimation(0, 100)
playerImages.forEach(p => player_anim.addAnimationFrame(p))

let enemy1_anim = animation.createAnimation(0, 50)
enemy1Images.forEach(p => enemy1_anim.addAnimationFrame(p))

let enemy2_anim = animation.createAnimation(0, 50)
enemy2Images.forEach(p => enemy2_anim.addAnimationFrame(p))

let player_sprite = sprites.create(playerImages[0])
animation.attachAnimation(player_sprite, player_anim)
animation.setAction(player_sprite, 0)

info.setLifeImage( img`
        . . . .
        . 5 5 .
        5 6 6 5
        5 5 6 5
        . 5 5 .
        . . . .
    `)
info.setBackgroundColor(16)
info.setBorderColor(1)
info.setFontColor(1)

let map: number[][] = []

// player state
let player_x:number
let player_y:number
let player_saved_x:number
let player_saved_y:number
let making_path:boolean
let path_length:number
let level = 0 // level config vars
let lives = 10
let immunity:number
let game_speed:number

class Enemy 
{
    x:number
    y:number
    vx:number
    vy:number
    sprite:Sprite
    randomize()
    {
        this.vx = randint(0, 2) > 0 ? 1 : -1
        this.vy = randint(0, 2) > 0 ? 1 : -1
    }
    constructor() {}
    collide() { return false }
    update()
    {
        if(this.collide())
            return
    
        this.sprite.setPosition((this.x + 0.5) * tile_size_c, (this.y + 0.5) * tile_size_c)
    }
    mark() {}
}

class Enemy1 extends Enemy 
{
    randomize()
    {   
        super.randomize() 
        this.x = randint(3, map_width_m3 - 1)
        this.y = randint(3, map_height_m3 - 1)
    }
    constructor()
    {
        super()
        this.randomize()
        this.sprite = sprites.create(enemy1Images[0])
        animation.attachAnimation(this.sprite, enemy1_anim)
        animation.setAction(this.sprite, 0)
    }
    collide() 
    {
        let collision = false
        const nx = this.x + this.vx
        if(map[this.y][nx] == MAP_CELL_ROAD)
        {
            this.vx = -this.vx
            collision = true
        }

        const ny = this.y + this.vy
        if(map[ny][this.x] == MAP_CELL_ROAD)
        {
            this.vy = -this.vy
            collision = true
        }

        if(!collision)
        {
            if(map[ny][nx] == MAP_CELL_ROAD)
            {
                this.vx = -this.vx
                this.vy = -this.vy
                collision = true
            }
            else
            {
                this.x = nx
                this.y = ny
            }
        }
        return collision
    }
    update() {
        super.update()
        if(map[this.y][this.x] == MAP_CELL_PATH)
            kill()
    }
    mark() {
        map[this.y][this.x] |= MAP_CELL_MARK
    }
}

class Enemy2 extends Enemy 
{
    randomize()
    {   
        super.randomize() 
        this.x = randint(map_width_m3 + 1, map_width - 1)
        this.y = randint(3, map_height_m3 - 1)
    }
    constructor()
    {
        super()
        this.randomize()
        this.sprite = sprites.create(enemy2Images[0])
        animation.attachAnimation(this.sprite, enemy2_anim)
        animation.setAction(this.sprite, 0)
    }
    collide() 
    {
        let collision = false
        const nx = this.x + this.vx
        if(nx < 0 || nx >= map_width || map[this.y][nx] != MAP_CELL_ROAD)
        {
            this.vx = -this.vx
            collision = true
        }

        const ny = this.y + this.vy
        if(ny < 0 || ny >= map_height || map[ny][this.x] != MAP_CELL_ROAD)
        {
            this.vy = -this.vy
            collision = true
        }

        if(!collision)
        {
            if(map[ny][nx] != MAP_CELL_ROAD)
            {
                this.vx = -this.vx
                this.vy = -this.vy
                collision = true
            }
            else
            {
                this.x = nx
                this.y = ny
            }
        }
        return collision
    }
    update() {
        super.update()
        if(!immunity && this.x == player_x && this.y == player_y)
            kill()
    }
}

let enemies:Enemy[] = []
enemies.push(new Enemy1)

function make_empty(x:number, y:number)
{
    map[y][x] = MAP_CELL_EMPTY
    const xs = x * tile_size_c
    const ys = y * tile_size_c
    bg.fillRect(xs, ys, tile_size_c, tile_size_c, EMPTY_COLOR)
}

function make_road(x:number, y:number)
{
    map[y][x] = MAP_CELL_ROAD
    const xs = x * tile_size_c
    const ys = y * tile_size_c
    bg.fillRect(xs, ys, tile_size_c, tile_size_c, ROAD_COLOR)
}

function make_path(x:number, y:number)
{
    if(making_path)
    {
        ++path_length
    }
    else
    {
        making_path = true
        path_length = 1
    }

    map[y][x] = MAP_CELL_PATH
    const xs = x * tile_size_c
    const ys = y * tile_size_c
    bg.fillRect(xs, ys, tile_size_c, tile_size_c, PATH_COLOR)
}

function propagate_mark(x:number, y:number)
{
    let cond = 
        (map[y - 1][x] & MAP_CELL_MARK) ||
        (map[y + 1][x] & MAP_CELL_MARK) ||
        (map[y][x - 1] & MAP_CELL_MARK) ||
        (map[y][x + 1] & MAP_CELL_MARK)

    if(cond)
        map[y][x] |= MAP_CELL_MARK
    
    return cond
}

function fill()
{
    making_path = false

    for(let y = 2; y <= map_height_m3; ++y)
        for(let x = 2; x <= map_width_m3; ++x)
        {
            const cell = map[y][x]
            if(cell == MAP_CELL_PATH)
                make_road(x, y)
        }

    enemies.forEach(function(enemy: Enemy, index: number) {
        enemy.mark() })

    let change:boolean
    do
    {
        change = false
        for(let y = 2; y <= map_height_m3; ++y)
            for(let x = 2; x <= map_width_m3; ++x)
                if(map[y][x] == MAP_CELL_EMPTY && propagate_mark(x, y))
                    change = true
        for(let y = map_height_m3; y >= 2; --y)
            for(let x = map_width_m3; x >= 2; --x)
                if(map[y][x] == MAP_CELL_EMPTY && propagate_mark(x, y))
                    change = true
    }
    while(change)

    for(let y = 2; y <= map_height_m3; ++y)
        for(let x = 2; x <= map_width_m3; ++x)
        {
            if(map[y][x] == MAP_CELL_EMPTY)
                make_road(x, y)
            else
                map[y][x] &= ~MAP_CELL_MARK
        }

    let empty = 0
    for(let y = 2; y <= map_height_m3; ++y)
        for(let x = 2; x <= map_width_m3; ++x)
        {
            if(map[y][x] == MAP_CELL_EMPTY)
                ++empty
        }

    if(empty < map_width * map_height / 5)
    {
        ++level
        ++lives
        music.magicWand.play()
        setupLevel()
    }
    else
    {
        music.powerUp.play()
    }
}

function kill()
{
    making_path = false
    music.pewPew.play()

    player_x = player_saved_x
    player_y = player_saved_y
    setPlayerPos()

    for(let y = 2; y < map_height - 2; ++y)
        for(let x = 2; x < map_width - 2; ++x)
        {
            const cell = map[y][x]
            if(cell == MAP_CELL_PATH)
                make_empty(x, y)
        }
        
    if(!immunity)
    {
        info.changeLifeBy(-1)
        immunity = 20
    }
}

function setPlayerPos()
{
    const cell = map[player_y][player_x]
    if(cell == MAP_CELL_EMPTY)
        make_path(player_x, player_y)
    else if(cell == MAP_CELL_ROAD)
    {
        if(making_path)
            fill()
        player_saved_x = player_x
        player_saved_y = player_y         
    }
    player_sprite.setPosition((player_x + 0.5) * tile_size_c, (player_y + 0.5) * tile_size_c)
}

function setupLevel()
{
    bg.fill(0)                              // fill the whole map with 0

    for(let y = 0; y < map_height; ++y)
    {
        map[y] = []
        for(let x = map_width - 1; x >= 0; --x)
            map[y][x] = MAP_CELL_EMPTY
        make_road(0, y);
        make_road(1, y);
        make_road(map_width - 1, y);
        make_road(map_width - 2, y);
    }

    for(let x = 0; x < map_width; ++x)
    {
        make_road(x, 0);
        make_road(x, 1);
        make_road(x, map_height - 1);
        make_road(x, map_height - 2);
    }

    player_x = player_y = 1
    setPlayerPos()

    enemies.forEach(function(enemy: Enemy, index: number) {
        enemy.randomize() })
   
    enemies.push(new Enemy1)
    if(level % 2 == 1)
        enemies.push(new Enemy2)

    game_speed = Math.max(50, 80 - level * 3)
    info.changeLifeBy(1)
    immunity = 20
}

setupLevel()
info.setLife(9)

game.onUpdateInterval(game_speed, function() {
    
    let dx = 0
    let dy = 0
    if(controller.down.isPressed())
        dy = 1
    else if(controller.up.isPressed())
        dy = -1
    else if(controller.right.isPressed())
        dx = 1
    else if(controller.left.isPressed())
        dx = -1

    if(dx != 0 || dy != 0)
    {
        const nx = player_x + dx
        const ny = player_y + dy
        if(
            nx >= 0 && nx < map_width &&
            ny >= 0 && ny < map_height &&
            map[ny][nx] != MAP_CELL_PATH &&
            (path_length > 1 || (nx != player_saved_x || ny != player_saved_y)))
        {
            player_x = nx
            player_y = ny
            setPlayerPos()
        }
    }

    // do enemies
    enemies.forEach(function(enemy: Enemy, index: number) {
        enemy.update()})

    if(immunity)
        info.showLife((--immunity & 1) != 0)
})