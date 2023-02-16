---
layout: wiki
headercolour: blue
---

# Python modules
A list of the Python modules and libraries on my GitHub, mostly relating to vector graphics. None of them are on a shared repository like PyPI yet, so they'll need to be used by cloning/downloading them and adding the folder to [sys.path](https://docs.python.org/3/library/sys.html#sys.path), or by using pip's [VCS functionality](https://pip.pypa.io/en/stable/topics/vcs-support/) (see their respective readmes).

## [CairoSVG](https://github.com/SilverCardioid/CairoSVG)
A general library for creating, reading and converting SVG files, currently incomplete. Originally a fork of [Kozea's library of the same name](https://github.com/Kozea/CairoSVG), it has mostly become its own thing (new name suggestions are welcome).

## [Cairopath](https://github.com/SilverCardioid/cairopath)
An earlier module for drawing and exporting vector graphics, made before I discovered CairoSVG. Relatively bare-bones and idiosyncratic, and mostly just published because FlagMap and several scripts in other repositories use it.

## [FlagMap](https://github.com/SilverCardioid/FlagMap)
A module for generating flag maps and wiki image maps.
