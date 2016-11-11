'use strict';
var path = require('path'),
    fs = require('fs'),
    temp = require('temp'),
    expect = require('chai').expect,

    looksSame = require('..');

function imagePath(name) {
    return path.join(__dirname, 'data', name);
}

function srcPath(name) {
    return path.join(imagePath(path.join('src', name)));
}

function readImage(name) {
    return fs.readFileSync(srcPath(name));
}

function forFilesAndBuffers(callback) {
    describe('with files as arguments', function() {
        callback(srcPath);
    });

    describe('with buffers as arguments', function() {
        callback(readImage);
    });
}

describe('looksSame', function() {
    it('should throw if both tolerance and strict options set', function() {
        expect(function() {
            looksSame(srcPath('ref.png'), srcPath('same.png'), {
                strict: true,
                tolerance: 9000
            }, function() {
            });
        }).to.throw(TypeError);
    });

    forFilesAndBuffers(function(getImage) {
        it('should return true for similar images', function(done) {
            looksSame(getImage('ref.png'), getImage('same.png'), function(error, equal) {
                expect(error).to.equal(null);
                expect(equal).to.equal(true);
                done();
            });
        });

        it('should return false for different images', function(done) {
            looksSame(getImage('ref.png'), getImage('different.png'), function(error, equal) {
                expect(error).to.equal(null);
                expect(equal).to.equal(false);
                done();
            });
        });

        it('should return true for different images when tolerance is higher than difference', function(done) {
            looksSame(getImage('ref.png'), getImage('different.png'), {tolerance: 50}, function(error, equal) {
                expect(error).to.equal(null);
                expect(equal).to.equal(true);
                done();
            });
        });

        it('should return true for different images when difference is not seen by human eye', function(done) {
            looksSame(getImage('ref.png'), getImage('different-unnoticable.png'), function(error, equal) {
                expect(error).to.equal(null);
                expect(equal).to.equal(true);
                done();
            });
        });

        it('should return false if difference is not seen by human eye and strict mode is enabled', function(done) {
            looksSame(getImage('ref.png'), getImage('different-unnoticable.png'), {strict: true}, function(error, equal) {
                expect(error).to.equal(null);
                expect(equal).to.equal(false);
                done();
            });
        });

        it('should work when images width does not match', function(done) {
            looksSame(getImage('ref.png'), getImage('wide.png'), function(error, equal) {
                expect(error).to.equal(null);
                expect(equal).to.equal(false);
                done();
            });
        });

        it('should work when images height does not match', function(done) {
            looksSame(getImage('ref.png'), getImage('tall.png'), function(error, equal) {
                expect(error).to.equal(null);
                expect(equal).to.equal(false);
                done();
            });
        });

        [
            'red',
            'blue',
            'green'
        ].forEach(function(channel) {
            it('should report image as different if the difference is only in ' + channel + ' channel', function(done) {
                looksSame(getImage('ref.png'), getImage(channel + '.png'), function(error, equal) {
                    expect(error).to.equal(null);
                    expect(equal).to.equal(false);
                    done();
                });
            });
        });

        it('should return false for images which differ from each other only by 1 pixel', function(done) {
            looksSame(getImage('no-caret.png'), getImage('1px-diff.png'), function(error, equal) {
                expect(error).to.equal(null);
                expect(equal).to.equal(false);
                done();
            });
        });
    });

    describe('with ignoreCaret', function() {
        forFilesAndBuffers(function(getImage) {
            it('if disabled, should return false for images with caret', function(done) {
                looksSame(getImage('no-caret.png'), getImage('caret.png'), function(error, equal) {
                    expect(error).to.equal(null);
                    expect(equal).to.equal(false);
                    done();
                });
            });

            it('if enabled, should return true for images with caret', function(done) {
                looksSame(getImage('no-caret.png'), getImage('caret.png'), {ignoreCaret: true}, function(error, equal) {
                    expect(error).to.equal(null);
                    expect(equal).to.equal(true);
                    done();
                });
            });

            it('if enabled, should return true for images with caret and antialiased pixels', function(done) {
                const opts = {
                    ignoreCaret: true,
                    ignoreAntialiasing: true
                };
                looksSame(getImage('caret+antialiasing.png'), getImage('no-caret+antialiasing.png'), opts, function(error, equal) {
                    expect(error).to.equal(null);
                    expect(equal).to.equal(true);
                    done();
                });
            });

            it('if enabled, should return false for images with 1px diff', function(done) {
                looksSame(getImage('no-caret.png'), getImage('1px-diff.png'), function(error, equal) {
                    expect(error).to.equal(null);
                    expect(equal).to.equal(false);
                    done();
                });
            });
        });
    });

    describe('with antialiasing', function() {
        forFilesAndBuffers(function(getImage) {
            it('should check images for antialiasing by default', function(done) {
                looksSame(getImage('antialiasing-ref.png'), getImage('antialiasing-actual.png'), function(error, equal) {
                    expect(error).to.equal(null);
                    expect(equal).to.equal(true);
                    done();
                });
            });

            it('if disabled, should return false for images with antialiasing', function(done) {
                looksSame(getImage('antialiasing-ref.png'), getImage('antialiasing-actual.png'), {ignoreAntialiasing: false}, function(error, equal) {
                    expect(error).to.equal(null);
                    expect(equal).to.equal(false);
                    done();
                });
            });

            it('if enabled, should return true for images with antialiasing', function(done) {
                looksSame(getImage('antialiasing-ref.png'), getImage('antialiasing-actual.png'), {ignoreAntialiasing: true}, function(error, equal) {
                    expect(error).to.equal(null);
                    expect(equal).to.equal(true);
                    done();
                });
            });

            it('should return false for images which differ even with ignore antialiasing option', function(done) {
                looksSame(getImage('no-caret.png'), getImage('1px-diff.png'), {ignoreAntialiasing: true}, function(error, equal) {
                    expect(error).to.equal(null);
                    expect(equal).to.equal(false);
                    done();
                });
            });
        });
    });
});

describe('createDiff', function() {
    beforeEach(function() {
        this.tempName = temp.path({suffix: '.png'});
    });

    afterEach(function() {
        if (fs.existsSync(this.tempName)) {
            fs.unlinkSync(this.tempName);
        }
    });

    it('should throw if both tolerance and strict options set', function() {
        expect(function() {
            looksSame.createDiff({
                reference: srcPath('ref.png'),
                current: srcPath('different.png'),
                diff: this.tempName,
                highlightColor: '#ff00ff',
                tolerance: 9000,
                strict: true
            }, function() {
            });
        }).to.throw(TypeError);
    });

    it('should copy a reference image if there is no difference', function(done) {
        var _this = this;
        looksSame.createDiff({
            reference: srcPath('ref.png'),
            current: srcPath('same.png'),
            diff: this.tempName,
            highlightColor: '#ff00ff'
        }, function() {
            looksSame(srcPath('ref.png'), _this.tempName, {strict: true}, function(error, equal) {
                expect(equal).to.equal(true);
                done();
            });
        });
    });

    it('should create an image file a diff for for two images', function(done) {
        var _this = this;
        looksSame.createDiff({
            reference: srcPath('ref.png'),
            current: srcPath('different.png'),
            diff: this.tempName,
            highlightColor: '#ff00ff',
        }, function() {
            expect(fs.existsSync(_this.tempName)).to.equal(true);
            done();
        });
    });

    it('should ignore the differences lower then tolerance', function(done) {
        var _this = this;
        looksSame.createDiff({
            reference: srcPath('ref.png'),
            current: srcPath('different.png'),
            diff: this.tempName,
            highlightColor: '#ff00ff',
            tolerance: 50
        }, function() {
            looksSame(srcPath('ref.png'), _this.tempName, {strict: true}, function(error, equal) {
                expect(equal).to.equal(true);
                done();
            });
        });
    });

    it('should create a proper diff', function(done) {
        var _this = this;
        looksSame.createDiff({
            reference: srcPath('ref.png'),
            current: srcPath('different.png'),
            diff: this.tempName,
            highlightColor: '#ff00ff'
        }, function() {
            looksSame(imagePath('diffs/small-magenta.png'), _this.tempName, function(error, equal) {
                expect(equal).to.equal(true);
                done();
            });
        });
    });

    it('should allow to change highlight color', function(done) {
        var _this = this;
        looksSame.createDiff({
            reference: srcPath('ref.png'),
            current: srcPath('different.png'),
            diff: this.tempName,
            highlightColor: '#00FF00'
        }, function() {
            looksSame(imagePath('diffs/small-green.png'), _this.tempName, function(error, equal) {
                expect(equal).to.equal(true);
                done();
            });
        });
    });

    it('should allow to build diff for taller images', function(done) {
        var _this = this;
        looksSame.createDiff({
            reference: srcPath('ref.png'),
            current: srcPath('tall-different.png'),
            diff: this.tempName,
            highlightColor: '#FF00FF'
        }, function() {
            looksSame(imagePath('diffs/taller-magenta.png'), _this.tempName, function(error, equal) {
                expect(equal).to.equal(true);
                done();
            });
        });
    });

    it('should allow to build diff for wider images', function(done) {
        var _this = this;
        looksSame.createDiff({
            reference: srcPath('ref.png'),
            current: srcPath('wide-different.png'),
            diff: this.tempName,
            highlightColor: '#FF00FF'
        }, function() {
            looksSame(imagePath('diffs/wider-magenta.png'), _this.tempName, function(error, equal) {
                expect(equal).to.equal(true);
                done();
            });
        });
    });

    it('should use non-strict comparator by default', function(done) {
        var _this = this;
        looksSame.createDiff({
            reference: srcPath('ref.png'),
            current: srcPath('different-unnoticable.png'),
            diff: this.tempName,
            highlightColor: '#FF00FF'
        }, function() {
            looksSame(srcPath('ref.png'), _this.tempName, function(error, equal) {
                expect(equal).to.equal(true);
                done();
            });
        });
    });

    it('should use strict comparator if strict option is true', function(done) {
        var _this = this;
        looksSame.createDiff({
            reference: srcPath('ref.png'),
            current: srcPath('different-unnoticable.png'),
            diff: this.tempName,
            strict: true,
            highlightColor: '#FF00FF'
        }, function() {
            looksSame(imagePath('diffs/strict.png'), _this.tempName, function(error, equal) {
                expect(equal).to.equal(true);
                done();
            });
        });
    });

    it('should return a buffer if no diff path option is specified', function(done) {
        looksSame.createDiff({
            reference: srcPath('ref.png'),
            current: srcPath('different.png'),
            highlightColor: '#ff00ff',
        }, function(error, buffer) {
            expect(buffer).to.be.an.instanceof(Buffer);
            done();
        });
    });

    it('should return a buffer equal to the diff on disk', function(done) {
        looksSame.createDiff({
            reference: srcPath('ref.png'),
            current: srcPath('different.png'),
            highlightColor: '#ff00ff',
        }, function(error, buffer) {
            looksSame(imagePath('diffs/small-magenta.png'), buffer, function(error, equal) {
                expect(equal).to.be.equal(true);
                done();
            });
        });
    });
});

describe('colors', function() {
    it('should return true for same colors', function() {
        expect(
            looksSame.colors(
                {R: 255, G: 0, B: 0},
                {R: 255, G: 0, B: 0}
            )
        ).to.be.equal(true);
    });

    it('should return false for different colors', function() {
        expect(
            looksSame.colors(
                {R: 255, G: 0, B: 0},
                {R: 0, G: 0, B: 255}
            )
        ).to.be.equal(false);
    });

    it('should return true for similar colors', function() {
        expect(
            looksSame.colors(
                {R: 255, G: 0, B: 0},
                {R: 254, G: 1, B: 1}
            )
        ).to.be.equal(true);
    });

    it('should return false for similar colors if tolerance is low enough', function() {
        expect(
            looksSame.colors(
                {R: 255, G: 0, B: 0},
                {R: 254, G: 1, B: 1},
                {tolerance: 0.0}
            )
        ).to.be.equal(false);
    });

    it('should return true for different colors if tolerance is high enough', function() {
        expect(
            looksSame.colors(
                {R: 255, G: 0, B: 0},
                {R: 0, G: 0, B: 255},
                {tolerance: 55.0}
            )
        ).to.be.equal(true);
    });
});
